import { Router, Request, Response } from "express";
import { EvciRequest, getWeekMonday } from "../models/EvciRequest";
import { User } from "../models/User";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { getParentChildIds, verifyParentChildAccess } from "../middleware/parentChildAccess";
import { NotificationService } from "../services/NotificationService";
import { AuditLogService } from "../services/auditLogService";
import { publishEvent } from "../utils/websocket-enhanced";
import { EventType } from "../services/EventService";
import { EvciWindowOverride } from "../models/EvciWindowOverride";
import { EvciExportService } from "../services/evciExportService";
import { PushNotificationService } from "../services/pushNotificationService";
import logger from "../utils/logger";

const router = Router();

/**
 * Türkiye saatiyle (UTC+3) mevcut zamanı döner.
 */
function getTurkeyNow(): Date {
  const now = new Date();
  // UTC milisaniye + 3 saat offset
  const turkeyOffset = 3 * 60 * 60 * 1000;
  return new Date(now.getTime() + turkeyOffset + now.getTimezoneOffset() * 60 * 1000);
}

/**
 * Talep penceresi açık mı? Önce override kontrol, sonra default gün kontrolü.
 */
async function isSubmissionWindowOpen(): Promise<boolean> {
  const turkeyNow = getTurkeyNow();
  const weekOf = getWeekMonday(turkeyNow);

  // Override kontrolü
  const override = await EvciWindowOverride.findOne({ weekOf });
  if (override) {
    return override.isOpen;
  }

  const day = turkeyNow.getDay(); // 0=Pazar, 1=Pazartesi, ..., 4=Perşembe
  return day >= 1 && day <= 4;
}

/**
 * Zaman penceresi bilgisini hesapla.
 */
async function getSubmissionWindowInfo() {
  const turkeyNow = getTurkeyNow();
  const day = turkeyNow.getDay();
  const weekOf = getWeekMonday(turkeyNow);

  // Override kontrolü
  const override = await EvciWindowOverride.findOne({ weekOf });
  let isOpen: boolean;
  let reason: string | undefined;

  if (override) {
    isOpen = override.isOpen;
    reason = override.reason;
  } else {
    isOpen = day >= 1 && day <= 4;
  }

  // Bu haftanın pazartesisi (pencere başlangıcı)
  const mondayDiff = day === 0 ? 6 : day - 1;
  const windowStart = new Date(turkeyNow);
  windowStart.setDate(turkeyNow.getDate() - mondayDiff);
  windowStart.setHours(0, 0, 0, 0);

  // Bu haftanın perşembesi 23:59 (pencere bitişi)
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowStart.getDate() + 3); // Perşembe
  windowEnd.setHours(23, 59, 59, 999);

  // Sonraki pencere başlangıcı
  let nextWindowStart: Date;
  if (day >= 5 || day === 0) {
    // Cuma, Cumartesi veya Pazar: sonraki Pazartesi
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    nextWindowStart = new Date(turkeyNow);
    nextWindowStart.setDate(turkeyNow.getDate() + daysUntilMonday);
    nextWindowStart.setHours(0, 0, 0, 0);
  } else {
    // Pazartesi-Perşembe: pencere zaten açık, sonraki pencere gelecek hafta
    nextWindowStart = new Date(windowStart);
    nextWindowStart.setDate(windowStart.getDate() + 7);
  }

  return {
    isOpen,
    reason,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    nextWindowStart: nextWindowStart.toISOString(),
    serverTime: turkeyNow.toISOString(),
    weekOf,
  };
}

// ============================================================
// Named routes MUST come before /:id routes (Express KRİTİK)
// ============================================================

// GET /submission-window — Zaman penceresi bilgisi
router.get("/submission-window", authenticateJWT, async (_req: Request, res: Response) => {
  try {
    res.json(await getSubmissionWindowInfo());
  } catch (error) {
    logger.error('Error getting submission window', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Zaman penceresi bilgisi alınamadı' });
  }
});

// GET /stats — İstatistik (admin/teacher) — MongoDB aggregation pipeline
router.get("/stats", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req: Request, res: Response) => {
  try {
    const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 8, 1), 52);

    // Haftalık trend için tarih aralığını hesapla
    const turkeyNow = getTurkeyNow();
    const currentWeekOf = getWeekMonday(turkeyNow);
    const startDate = new Date(currentWeekOf);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);
    const startWeekOf = getWeekMonday(startDate);

    // Aggregation: summary + weekly + parentApproval in one pipeline
    const [summaryAgg, weeklyAgg, approvalAgg] = await Promise.all([
      // Summary counts
      EvciRequest.aggregate([
        { $match: { weekOf: { $gte: startWeekOf } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            going: { $sum: { $cond: ['$willGo', 1, 0] } },
            notGoing: { $sum: { $cond: ['$willGo', 0, 1] } },
          },
        },
      ]),

      // Weekly trend
      EvciRequest.aggregate([
        { $match: { weekOf: { $gte: startWeekOf } } },
        {
          $group: {
            _id: '$weekOf',
            total: { $sum: 1 },
            going: { $sum: { $cond: ['$willGo', 1, 0] } },
            notGoing: { $sum: { $cond: ['$willGo', 0, 1] } },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, weekOf: '$_id', total: 1, going: 1, notGoing: 1 } },
      ]),

      // Parent approval counts
      EvciRequest.aggregate([
        { $match: { weekOf: { $gte: startWeekOf } } },
        {
          $group: {
            _id: '$parentApproval',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryAgg[0] || { total: 0, going: 0, notGoing: 0 };
    delete summary._id;

    const approvalMap: Record<string, number> = {};
    for (const a of approvalAgg) {
      approvalMap[a._id || 'pending'] = a.count;
    }

    // Sınıf dağılımı — requires student lookup (no foreign key in Mongoose for this)
    const studentIds = await EvciRequest.distinct('studentId', { weekOf: { $gte: startWeekOf } });
    const students = await User.find({ id: { $in: studentIds } }).select('id sinif sube').lean();
    const studentMap = new Map(students.map(s => [s.id, s]));

    // Count requests per class using aggregation
    const classAgg = await EvciRequest.aggregate([
      { $match: { weekOf: { $gte: startWeekOf } } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
    ]);

    const classMap: Record<string, number> = {};
    for (const entry of classAgg) {
      const st = studentMap.get(entry._id);
      const cls = st?.sinif ? `${st.sinif}${st.sube || ''}` : 'Bilinmeyen';
      classMap[cls] = (classMap[cls] || 0) + entry.count;
    }
    const classDistribution = Object.entries(classMap)
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      summary,
      weekly: weeklyAgg,
      classDistribution,
      parentApproval: {
        approved: approvalMap['approved'] || 0,
        rejected: approvalMap['rejected'] || 0,
        pending: approvalMap['pending'] || 0,
      },
    });
  } catch (error) {
    logger.error('Error getting evci stats', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// GET /export — Excel/PDF export (admin/teacher)
router.get("/export", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'excel';
    const weekOf = req.query.weekOf as string || getWeekMonday(getTurkeyNow());

    const requests = await EvciRequest.find({ weekOf }).sort({ studentName: 1 });

    // Öğrenci bilgilerini al
    const studentIds = [...new Set(requests.map(r => r.studentId))];
    const students = await User.find({ id: { $in: studentIds } }).select('id sinif sube oda');
    const studentMap = new Map(students.map(s => [s.id, s]));

    const rows = requests.map(r => {
      const st = studentMap.get(r.studentId);
      return {
        studentName: r.studentName || '-',
        studentId: r.studentId,
        sinif: st?.sinif ? `${st.sinif}${st.sube || ''}` : '-',
        oda: st?.oda || '-',
        willGo: r.willGo,
        destination: r.destination || '-',
        startDate: r.startDate || '-',
        endDate: r.endDate || '-',
        parentApproval: r.parentApproval,
        rejectionReason: r.rejectionReason || '-',
      };
    });

    if (format === 'pdf') {
      const buffer = await EvciExportService.generatePdf(rows, weekOf);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=evci-${weekOf}.pdf`);
      res.send(buffer);
    } else {
      const buffer = await EvciExportService.generateExcel(rows, weekOf);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=evci-${weekOf}.xlsx`);
      res.send(buffer);
    }

    // Audit log (async, fire-and-forget)
    AuditLogService.log(req, 'export' as any, 'evci_request', {
      details: { format, weekOf, count: rows.length },
    });
  } catch (error) {
    logger.error('Error exporting evci requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Dışa aktarma sırasında hata oluştu' });
  }
});

// POST /bulk-status — Toplu admin onay/red
router.post("/bulk-status", authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { ids, status, adminNote } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids dizisi zorunludur' });
    }
    if (ids.length > 1000) {
      return res.status(400).json({ error: 'En fazla 1000 talep seçilebilir' });
    }
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "status 'approved' veya 'rejected' olmalıdır" });
    }
    if (adminNote && typeof adminNote === 'string' && adminNote.length > 500) {
      return res.status(400).json({ error: 'Admin notu en fazla 500 karakter olabilir' });
    }

    const userId = req.user?.userId;

    const updateFields: Record<string, any> = {
      status,
      approvedBy: userId,
      approvedAt: new Date(),
    };
    if (adminNote) updateFields.adminNote = adminNote;

    // Admin onayladıysa veli onayı da otomatik onayla
    if (status === 'approved') {
      updateFields.parentApproval = 'approved';
      updateFields.parentApprovalAt = new Date();
      updateFields.parentApprovalBy = userId;
    }

    const result = await EvciRequest.updateMany(
      { _id: { $in: ids } },
      { $set: updateFields }
    );

    // Audit log + WS events (fire-and-forget)
    for (const id of ids) {
      AuditLogService.log(req, status === 'approved' ? 'approve' : 'reject', 'evci_request', {
        resourceId: id,
        details: { bulkAction: true, adminNote },
      });
    }

    // Notify affected students
    const updatedReqs = await EvciRequest.find({ _id: { $in: ids } });
    for (const evciReq of updatedReqs) {
      const eventType = status === 'approved'
        ? EventType.EVCI_REQUEST_APPROVED
        : EventType.EVCI_REQUEST_REJECTED;
      publishEvent(eventType, {
        studentId: evciReq.studentId,
        studentName: evciReq.studentName,
      }, evciReq.studentId).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));

      // Push notification to student
      const bulkPushTitle = status === 'approved' ? 'Evci Talebi Onaylandı' : 'Evci Talebi Reddedildi';
      const bulkPushBody = status === 'approved'
        ? 'Evci talebiniz yönetici tarafından onaylandı.'
        : 'Evci talebiniz yönetici tarafından reddedildi.';
      PushNotificationService.sendToUser(evciReq.studentId, {
        title: bulkPushTitle,
        body: bulkPushBody,
        url: '/student/evci',
      }).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));
    }

    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    logger.error('Error bulk updating evci requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Toplu güncelleme sırasında hata oluştu' });
  }
});

// POST /window-override — Tatil/özel gün pencere override (admin)
router.post("/window-override", authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { weekOf, isOpen, reason } = req.body;

    if (!weekOf) {
      return res.status(400).json({ error: 'weekOf alanı zorunludur' });
    }
    if (typeof weekOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
      return res.status(400).json({ error: 'weekOf YYYY-MM-DD formatında olmalıdır' });
    }
    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ error: 'isOpen boolean olmalıdır' });
    }
    if (reason && typeof reason === 'string' && reason.length > 500) {
      return res.status(400).json({ error: 'Sebep en fazla 500 karakter olabilir' });
    }

    const userId = req.user?.userId;

    const override = await EvciWindowOverride.findOneAndUpdate(
      { weekOf },
      { isOpen, reason: reason || '', createdBy: userId },
      { upsert: true, new: true }
    );

    AuditLogService.log(req, 'update', 'evci_request', {
      details: { windowOverride: true, weekOf, isOpen, reason },
    });

    res.json(override);
  } catch (error) {
    logger.error('Error setting window override', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Pencere override ayarlanırken hata oluştu' });
  }
});

// Tüm evci taleplerini getir (admin) — with pagination
router.get("/", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      EvciRequest.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      EvciRequest.countDocuments(),
    ]);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching evci requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Evci talepleri alınamadı' });
  }
});

// GET /parent/:parentId — Velinin çocuklarının talepleri
router.get("/parent/:parentId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { parentId } = req.params;
    const role = req.user?.role;
    const userId = req.user?.userId;

    // Veli sadece kendi ID'si ile çağırabilir, admin/teacher herkesi sorgulayabilir
    if (role === 'parent' && parentId !== userId) {
      return res.status(403).json({ error: 'Sadece kendi çocuklarınızın taleplerini görebilirsiniz' });
    }
    if (role !== 'parent' && role !== 'admin' && role !== 'teacher') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    const childIds = await getParentChildIds(parentId);
    if (!childIds || childIds.length === 0) {
      return res.json({ requests: [], children: [] });
    }

    // Çocuk bilgileri
    const children = await User.find({ id: { $in: childIds }, rol: 'student' })
      .select('id adSoyad sinif sube oda pansiyon');

    // Talepleri getir
    const requests = await EvciRequest.find({ studentId: { $in: childIds } })
      .sort({ createdAt: -1 });

    res.json({ requests, children });
  } catch (error) {
    logger.error('Error fetching parent evci requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Veli evci talepleri alınamadı' });
  }
});

// Belirli bir öğrencinin evci talepleri - ownership check
router.get("/student/:studentId", authenticateJWT, verifyParentChildAccess('params.studentId'), async (req, res) => {
  try {
    const list = await EvciRequest.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    logger.error('Error fetching student evci requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Öğrenci evci talepleri alınamadı' });
  }
});

// POST / — Yeni evci talebi oluştur
router.post("/", authenticateJWT, authorizeRoles(['student', 'parent', 'admin']), async (req: Request, res: Response) => {
  try {
    const { studentId, willGo, startDate, endDate, destination } = req.body;

    // Zorunlu alanları kontrol et
    if (!studentId) {
      return res.status(400).json({ error: 'Öğrenci ID zorunludur' });
    }

    // Ownership validation
    const role = req.user?.role;
    const userId = req.user?.userId;
    if (role === 'student' && studentId !== userId) {
      return res.status(403).json({ error: 'Sadece kendi adınıza evci talebi oluşturabilirsiniz' });
    }
    if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (!childIds.includes(studentId)) {
        return res.status(403).json({ error: 'Bu öğrenci için evci talebi oluşturma yetkiniz yok' });
      }
    }

    // Zaman penceresi kontrolü (admin hariç)
    if (role !== 'admin' && !(await isSubmissionWindowOpen())) {
      return res.status(400).json({
        error: 'Evci talepleri sadece Pazartesi-Perşembe arasında oluşturulabilir',
        submissionWindow: await getSubmissionWindowInfo(),
      });
    }

    if (willGo === undefined || willGo === null) {
      return res.status(400).json({ error: 'willGo alanı zorunludur' });
    }

    // Normalize willGo to boolean
    const willGoNormalized = willGo === true || willGo === 'true';

    // willGo true ise çıkış/dönüş günü ve yer gerekli
    if (willGoNormalized) {
      if (!startDate) {
        return res.status(400).json({ error: 'Çıkış günü zorunludur' });
      }
      if (!endDate) {
        return res.status(400).json({ error: 'Dönüş günü zorunludur' });
      }
      if (!destination) {
        return res.status(400).json({ error: 'Gidilecek yer zorunludur' });
      }
    }

    // weekOf hesapla
    const weekOf = getWeekMonday(getTurkeyNow());

    // Aynı (studentId, weekOf) ile kayıt kontrolü
    const existingReq = await EvciRequest.findOne({ studentId, weekOf });
    if (existingReq) {
      if (existingReq.parentApproval === 'rejected') {
        // Reddedilmiş talep varsa sil, yenisini oluştur
        await EvciRequest.findByIdAndDelete(existingReq._id);
      } else {
        return res.status(409).json({ error: 'Bu hafta için zaten bir evci talebiniz bulunmaktadır' });
      }
    }

    // Öğrenci adını al
    const user = await User.findOne({ id: studentId });
    const studentName = user ? user.adSoyad : 'Bilinmeyen Öğrenci';

    const newReq = new EvciRequest({
      studentId,
      studentName,
      willGo: willGoNormalized,
      startDate: startDate || null,
      endDate: endDate || null,
      destination: destination || null,
      weekOf,
      parentApproval: 'pending',
    });
    await newReq.save();

    // Veli(ler)e bildirim gönder
    try {
      const parents = await User.find({ childId: studentId, rol: 'parent', isActive: true });
      const parentIds = parents.map(p => p.id);
      for (const parent of parents) {
        await NotificationService.createNotification({
          userId: parent.id,
          title: 'Yeni Evci Talebi',
          message: `${studentName} yeni bir evci talebi oluşturdu. Onayınız bekleniyor.`,
          type: 'approval',
          priority: 'high',
          category: 'administrative',
          sendEmail: true,
          emailSubject: 'Evci Talebi - Onayınız Bekleniyor',
          actionUrl: '/parent/evci',
          actionText: 'Talebi Görüntüle',
        });
      }

      // WebSocket event
      publishEvent(EventType.EVCI_REQUEST_CREATED, {
        studentId,
        studentName,
        parentIds,
      }, userId).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));

      // Push notifications to parents
      for (const parent of parents) {
        PushNotificationService.sendToUser(parent.id, {
          title: 'Yeni Evci Talebi',
          body: `${studentName} yeni bir evci talebi oluşturdu. Onayınız bekleniyor.`,
          url: '/parent/evci',
        }).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));
      }
    } catch (notifError) {
      logger.error('Error sending parent notifications', { error: notifError instanceof Error ? notifError.message : notifError });
    }

    // Audit log (fire-and-forget)
    AuditLogService.log(req, 'create', 'evci_request', {
      resourceId: String(newReq._id),
      details: { studentId, weekOf, willGo: willGoNormalized },
    });

    res.status(201).json(newReq);
  } catch (error: any) {
    // Unique index violation (duplicate key)
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Bu hafta için zaten bir evci talebiniz bulunmaktadır' });
    }
    logger.error('Error creating evci request', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Evci talebi oluşturulurken hata oluştu' });
  }
});

// PATCH /:id/admin-approval — Admin bireysel onay/red
router.patch("/:id/admin-approval", authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { action, adminNote } = req.body;
    const userId = req.user?.userId;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "action alanı 'approve' veya 'reject' olmalıdır" });
    }
    if (adminNote && typeof adminNote === 'string' && adminNote.length > 500) {
      return res.status(400).json({ error: 'Admin notu en fazla 500 karakter olabilir' });
    }

    const evciReq = await EvciRequest.findById(req.params.id);
    if (!evciReq) {
      return res.status(404).json({ error: 'Evci talebi bulunamadı' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    evciReq.status = status;
    evciReq.approvedBy = userId;
    evciReq.approvedAt = new Date();
    if (adminNote) evciReq.adminNote = adminNote;

    // Admin onayladıysa veli onayı da otomatik onayla
    if (action === 'approve' && evciReq.parentApproval === 'pending') {
      evciReq.parentApproval = 'approved';
      evciReq.parentApprovalAt = new Date();
      evciReq.parentApprovalBy = userId;
    }

    await evciReq.save();

    // WebSocket + Push
    const eventType = action === 'approve'
      ? EventType.EVCI_REQUEST_APPROVED
      : EventType.EVCI_REQUEST_REJECTED;
    publishEvent(eventType, {
      studentId: evciReq.studentId,
      studentName: evciReq.studentName,
    }, evciReq.studentId).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));

    const pushTitle = action === 'approve' ? 'Evci Talebi Onaylandı' : 'Evci Talebi Reddedildi';
    const pushBody = action === 'approve'
      ? 'Evci talebiniz yönetici tarafından onaylandı.'
      : 'Evci talebiniz yönetici tarafından reddedildi.';
    PushNotificationService.sendToUser(evciReq.studentId, {
      title: pushTitle,
      body: pushBody,
      url: '/student/evci',
    }).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));

    // Audit log
    AuditLogService.log(req, action === 'approve' ? 'approve' : 'reject', 'evci_request', {
      resourceId: String(evciReq._id),
      details: { studentId: evciReq.studentId, adminNote, individualAction: true },
    });

    res.json(evciReq);
  } catch (error) {
    logger.error('Error admin approving evci request', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Admin onayı güncellenirken hata oluştu' });
  }
});

// PATCH /:id/parent-approval — Veli onay/red
router.patch("/:id/parent-approval", authenticateJWT, authorizeRoles(['parent']), async (req: Request, res: Response) => {
  try {
    const { action, reason } = req.body;
    const userId = req.user?.userId;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "action alanı 'approve' veya 'reject' olmalıdır" });
    }

    const evciReq = await EvciRequest.findById(req.params.id);
    if (!evciReq) {
      return res.status(404).json({ error: 'Evci talebi bulunamadı' });
    }

    // Veli-öğrenci ilişkisi doğrula
    const childIds = await getParentChildIds(userId!);
    if (!childIds.includes(evciReq.studentId)) {
      return res.status(403).json({ error: 'Bu evci talebini onaylama/reddetme yetkiniz yok' });
    }

    // Sadece pending durumundaki talepler onaylanabilir/reddedilebilir
    if (evciReq.parentApproval !== 'pending') {
      return res.status(400).json({ error: 'Bu talep zaten onaylanmış veya reddedilmiş' });
    }

    evciReq.parentApproval = action === 'approve' ? 'approved' : 'rejected';
    evciReq.parentApprovalAt = new Date();
    evciReq.parentApprovalBy = userId;

    // Veli onayı admin onayını bypass etmez — sadece parentApproval set edilir
    // Admin onayı ayrıca gereklidir

    // Red sebebi kaydet
    if (action === 'reject') {
      evciReq.rejectionReason = reason || null;
    }

    await evciReq.save();

    // Öğrenciye bildirim gönder
    try {
      if (action === 'approve') {
        await NotificationService.createNotification({
          userId: evciReq.studentId,
          title: 'Veli Onayı Alındı',
          message: 'Veliniz evci talebinizi onayladı. Yönetici onayı bekleniyor.',
          type: 'info',
          priority: 'medium',
          category: 'administrative',
          sendEmail: true,
          emailSubject: 'Evci Talebi - Veli Onayı Alındı',
          actionUrl: '/student/evci',
          actionText: 'Talebi Görüntüle',
        });
      } else {
        const reasonText = reason ? ` Sebep: ${reason}` : '';
        await NotificationService.createNotification({
          userId: evciReq.studentId,
          title: 'Evci Talebi Reddedildi',
          message: `Veliniz evci talebinizi reddetti.${reasonText} Yeni talep oluşturabilirsiniz.`,
          type: 'warning',
          priority: 'high',
          category: 'administrative',
          sendEmail: true,
          emailSubject: 'Evci Talebiniz Reddedildi',
          actionUrl: '/student/evci',
          actionText: 'Yeni Talep Oluştur',
        });
      }

      // WebSocket event
      const eventType = action === 'approve'
        ? EventType.EVCI_REQUEST_APPROVED
        : EventType.EVCI_REQUEST_REJECTED;
      publishEvent(eventType, {
        studentId: evciReq.studentId,
        studentName: evciReq.studentName,
      }, evciReq.studentId).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));

      // Push notification to student
      const pushTitle = action === 'approve' ? 'Evci Talebi Onaylandı' : 'Evci Talebi Reddedildi';
      const pushBody = action === 'approve'
        ? 'Veliniz evci talebinizi onayladı.'
        : `Veliniz evci talebinizi reddetti.${reason ? ` Sebep: ${reason}` : ''}`;
      PushNotificationService.sendToUser(evciReq.studentId, {
        title: pushTitle,
        body: pushBody,
        url: '/student/evci',
      }).catch((err: unknown) => logger.error('Async side-effect failed', { error: err instanceof Error ? err.message : err }));
    } catch (notifError) {
      logger.error('Error sending student notification', { error: notifError instanceof Error ? notifError.message : notifError });
    }

    // Audit log (fire-and-forget)
    AuditLogService.log(req, action === 'approve' ? 'approve' : 'reject', 'evci_request', {
      resourceId: String(evciReq._id),
      details: { studentId: evciReq.studentId, reason },
    });

    res.json(evciReq);
  } catch (error) {
    logger.error('Error updating parent approval', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Veli onayı güncellenirken hata oluştu' });
  }
});

// DELETE /:id — Evci talebini sil
router.delete("/:id", authenticateJWT, authorizeRoles(['admin', 'student', 'parent']), async (req, res) => {
  try {
    const evciReq = await EvciRequest.findById(req.params.id);
    if (!evciReq) {
      return res.status(404).json({ error: 'Evci talebi bulunamadı' });
    }

    const role = req.user?.role;
    const userId = req.user?.userId;

    // Veli onaylanmışsa öğrenci/veli silemez (admin hariç)
    if (role !== 'admin' && evciReq.parentApproval === 'approved') {
      return res.status(403).json({ error: 'Veli tarafından onaylanmış talep silinemez' });
    }

    if (role === 'student' && evciReq.studentId !== userId) {
      return res.status(403).json({ error: 'Sadece kendi evci talebinizi silebilirsiniz' });
    }
    if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (!childIds.includes(evciReq.studentId)) {
        return res.status(403).json({ error: 'Bu evci talebini silme yetkiniz yok' });
      }
    }

    await EvciRequest.findByIdAndDelete(req.params.id);

    // Audit log (fire-and-forget)
    AuditLogService.log(req, 'delete', 'evci_request', {
      resourceId: req.params.id,
      details: { studentId: evciReq.studentId },
    });

    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting evci request', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Evci talebi silinirken hata oluştu' });
  }
});

// PATCH /:id — Evci talebini güncelle
router.patch("/:id", authenticateJWT, authorizeRoles(['admin', 'student', 'parent']), async (req, res) => {
  try {
    const evciReq = await EvciRequest.findById(req.params.id);
    if (!evciReq) {
      return res.status(404).json({ error: 'Evci talebi bulunamadı' });
    }

    const role = req.user?.role;
    const userId = req.user?.userId;

    // Veli onaylanmışsa öğrenci/veli güncelleyemez (admin hariç)
    if (role !== 'admin' && evciReq.parentApproval === 'approved') {
      return res.status(403).json({ error: 'Veli tarafından onaylanmış talep güncellenemez' });
    }

    if (role === 'student' && evciReq.studentId !== userId) {
      return res.status(403).json({ error: 'Sadece kendi evci talebinizi güncelleyebilirsiniz' });
    }
    if (role === 'parent') {
      const childIds = await getParentChildIds(userId!);
      if (!childIds.includes(evciReq.studentId)) {
        return res.status(403).json({ error: 'Bu evci talebini güncelleme yetkiniz yok' });
      }
    }

    // Admin değilse korumalı alanları body'den sil
    const updateData = { ...req.body };
    if (role !== 'admin') {
      delete updateData.parentApproval;
      delete updateData.parentApprovalAt;
      delete updateData.parentApprovalBy;
      delete updateData.status;
      delete updateData.weekOf;
    }

    const updated = await EvciRequest.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    // Audit log (fire-and-forget)
    AuditLogService.log(req, 'update', 'evci_request', {
      resourceId: req.params.id,
      details: { studentId: evciReq.studentId, updatedFields: Object.keys(updateData) },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Error updating evci request', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Evci talebi güncellenirken hata oluştu' });
  }
});

export default router;
