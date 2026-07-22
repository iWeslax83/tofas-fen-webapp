import { EvciRequest, IEvciRequest, getWeekMonday } from '../models/EvciRequest';
import { User } from '../models/User';
import { EvciWindowOverride } from '../models/EvciWindowOverride';
import { CalendarEvent } from '../models/Calendar';
import { NotificationService } from './NotificationService';
import { publishEvent } from '../utils/websocket-enhanced';
import { EventType } from './EventService';
import { EvciExportService } from './evciExportService';
import { PushNotificationService } from './pushNotificationService';
import { getParentChildIds } from '../middleware/parentChildAccess';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface WindowInfo {
  isOpen: boolean;
  reason?: string;
  windowStart: string;
  windowEnd: string;
  nextWindowStart: string;
  serverTime: string;
  weekOf: string;
}

export interface StatsResult {
  summary: { total: number; going: number; notGoing: number };
  weekly: { weekOf: string; total: number; going: number; notGoing: number }[];
  classDistribution: { className: string; count: number }[];
  parentApproval: { approved: number; rejected: number; pending: number };
}

export interface PaginatedRequests {
  requests: IEvciRequest[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ParentRequestsResult {
  requests: IEvciRequest[];
  children: {
    id: string;
    adSoyad: string;
    sinif?: string;
    sube?: string;
    oda?: string;
    pansiyon?: boolean;
  }[];
}

export interface ExportRow {
  studentName: string;
  studentId: string;
  sinif: string;
  oda: string;
  willGo: boolean;
  destination: string;
  startDate: string;
  endDate: string;
  parentApproval: string;
  rejectionReason: string;
}

export interface BulkStatusResult {
  modifiedCount: number;
}

export interface CreateEvciRequestInput {
  studentId: string;
  willGo: boolean | string;
  startDate?: string;
  endDate?: string;
  destination?: string;
  userId?: string;
}

export interface CreateEvciRequestResult {
  request: IEvciRequest;
  parentIds: string[];
  studentName: string;
}

export interface AdminApprovalInput {
  id: string;
  action: 'approve' | 'reject';
  adminNote?: string;
  userId?: string;
}

export interface ParentApprovalInput {
  id: string;
  action: 'approve' | 'reject';
  reason?: string;
  userId: string;
}

// ---------------------------------------------------------------------------
// Helpers (private, not exported)
// ---------------------------------------------------------------------------

function getTurkeyNow(): Date {
  const now = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  return new Date(now.getTime() + turkeyOffset + now.getTimezoneOffset() * 60 * 1000);
}

/**
 * Okul takviminde ('holiday' tipi, herkese açık etkinlik) verilen anı kapsayan
 * bir tatil (yaz tatili, yarıyıl tatili vb.) varsa onu döner. Yönetici bu
 * etkinlikleri Takvim sayfasından oluşturur; ek bir tarih config'i gerekmez.
 */
async function findActiveHoliday(date: Date) {
  return CalendarEvent.findOne({
    type: 'holiday',
    isPublic: true,
    startDate: { $lte: date },
    endDate: { $gte: date },
  }).sort({ startDate: -1 });
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EvciRequestService {
  // -------------------------------------------------------------------------
  // Submission window
  // -------------------------------------------------------------------------

  static async isSubmissionWindowOpen(): Promise<boolean> {
    const turkeyNow = getTurkeyNow();
    const weekOf = getWeekMonday(turkeyNow);

    const override = await EvciWindowOverride.findOne({ weekOf });
    if (override) {
      return override.isOpen;
    }

    if (await findActiveHoliday(turkeyNow)) {
      return false;
    }

    const day = turkeyNow.getDay();
    return day >= 1 && day <= 4;
  }

  static async getSubmissionWindowInfo(): Promise<WindowInfo> {
    const turkeyNow = getTurkeyNow();
    const day = turkeyNow.getDay();
    const weekOf = getWeekMonday(turkeyNow);

    const override = await EvciWindowOverride.findOne({ weekOf });
    let isOpen: boolean;
    let reason: string | undefined;

    if (override) {
      isOpen = override.isOpen;
      reason = override.reason;
    } else {
      const holiday = await findActiveHoliday(turkeyNow);
      if (holiday) {
        isOpen = false;
        reason = holiday.title;
      } else {
        isOpen = day >= 1 && day <= 4;
      }
    }

    const mondayDiff = day === 0 ? 6 : day - 1;
    const windowStart = new Date(turkeyNow);
    windowStart.setDate(turkeyNow.getDate() - mondayDiff);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 3);
    windowEnd.setHours(23, 59, 59, 999);

    let nextWindowStart: Date;
    if (day >= 5 || day === 0) {
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      nextWindowStart = new Date(turkeyNow);
      nextWindowStart.setDate(turkeyNow.getDate() + daysUntilMonday);
      nextWindowStart.setHours(0, 0, 0, 0);
    } else {
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

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  static async getStats(weeks: number): Promise<StatsResult> {
    const turkeyNow = getTurkeyNow();
    const currentWeekOf = getWeekMonday(turkeyNow);
    const startDate = new Date(currentWeekOf);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);
    const startWeekOf = getWeekMonday(startDate);

    const [summaryAgg, weeklyAgg, approvalAgg] = await Promise.all([
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

    const studentIds = await EvciRequest.distinct('studentId', { weekOf: { $gte: startWeekOf } });
    const students = await User.find({ id: { $in: studentIds } })
      .select('id sinif sube')
      .lean();
    const studentMap = new Map(students.map((s) => [s.id, s]));

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

    return {
      summary: summary as { total: number; going: number; notGoing: number },
      weekly: weeklyAgg as { weekOf: string; total: number; going: number; notGoing: number }[],
      classDistribution,
      parentApproval: {
        approved: approvalMap['approved'] || 0,
        rejected: approvalMap['rejected'] || 0,
        pending: approvalMap['pending'] || 0,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  static async buildExportRows(weekOf: string): Promise<ExportRow[]> {
    const requests = await EvciRequest.find({ weekOf }).sort({ studentName: 1 });

    const studentIds = [...new Set(requests.map((r) => r.studentId))];
    const students = await User.find({ id: { $in: studentIds } }).select('id sinif sube oda');
    const studentMap = new Map(students.map((s) => [s.id, s]));

    return requests.map((r) => {
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
  }

  static async generateExcelExport(rows: ExportRow[], weekOf: string): Promise<Buffer> {
    return EvciExportService.generateExcel(rows, weekOf);
  }

  static async generatePdfExport(rows: ExportRow[], weekOf: string): Promise<Buffer> {
    return EvciExportService.generatePdf(rows, weekOf);
  }

  // -------------------------------------------------------------------------
  // Paginated list (admin/teacher)
  // -------------------------------------------------------------------------

  static async listAll(page: number, limit: number): Promise<PaginatedRequests> {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      EvciRequest.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      EvciRequest.countDocuments(),
    ]);
    return {
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // -------------------------------------------------------------------------
  // Parent view
  // -------------------------------------------------------------------------

  static async getParentRequests(parentId: string): Promise<ParentRequestsResult> {
    const childIds = await getParentChildIds(parentId);
    if (!childIds || childIds.length === 0) {
      return { requests: [], children: [] };
    }

    const children = await User.find({ id: { $in: childIds }, rol: 'student' }).select(
      'id adSoyad sinif sube oda pansiyon',
    );

    const requests = await EvciRequest.find({ studentId: { $in: childIds } }).sort({
      createdAt: -1,
    });

    return { requests, children };
  }

  // -------------------------------------------------------------------------
  // Student view
  // -------------------------------------------------------------------------

  static async getStudentRequests(studentId: string): Promise<IEvciRequest[]> {
    return EvciRequest.find({ studentId }).sort({ createdAt: -1 });
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  static async createRequest(input: CreateEvciRequestInput): Promise<CreateEvciRequestResult> {
    const { studentId, willGo, startDate, endDate, destination, userId } = input;

    const willGoNormalized = willGo === true || willGo === 'true';
    const weekOf = getWeekMonday(getTurkeyNow());

    // Duplicate check / rejected-duplicate replace
    const existingReq = await EvciRequest.findOne({ studentId, weekOf });
    if (existingReq) {
      if (existingReq.parentApproval === 'rejected') {
        await EvciRequest.findByIdAndDelete(existingReq._id);
      } else {
        const err = Object.assign(
          new Error('Bu hafta için zaten bir evci talebiniz bulunmaktadır'),
          { statusCode: 409 },
        );
        throw err;
      }
    }

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

    // Notify parents (fire-and-forget, caller may wrap in try/catch)
    const parents = await User.find({ childId: studentId, rol: 'parent', isActive: true });
    const parentIds = parents.map((p) => p.id);

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

    publishEvent(
      EventType.EVCI_REQUEST_CREATED,
      { studentId, studentName, parentIds },
      userId,
    ).catch((err: unknown) =>
      logger.error('Async side-effect failed', {
        error: err instanceof Error ? err.message : err,
      }),
    );

    for (const parent of parents) {
      PushNotificationService.sendToUser(parent.id, {
        title: 'Yeni Evci Talebi',
        body: `${studentName} yeni bir evci talebi oluşturdu. Onayınız bekleniyor.`,
        url: '/parent/evci',
      }).catch((err: unknown) =>
        logger.error('Async side-effect failed', {
          error: err instanceof Error ? err.message : err,
        }),
      );
    }

    return { request: newReq, parentIds, studentName };
  }

  // -------------------------------------------------------------------------
  // Admin individual approval
  // -------------------------------------------------------------------------

  static async applyAdminApproval(input: AdminApprovalInput): Promise<IEvciRequest> {
    const { id, action, adminNote, userId } = input;

    const evciReq = await EvciRequest.findById(id);
    if (!evciReq) {
      const err = Object.assign(new Error('Evci talebi bulunamadı'), { statusCode: 404 });
      throw err;
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    evciReq.status = status;
    evciReq.approvedBy = userId;
    evciReq.approvedAt = new Date();
    if (adminNote) evciReq.adminNote = adminNote;

    if (action === 'approve' && evciReq.parentApproval === 'pending') {
      evciReq.parentApproval = 'approved';
      evciReq.parentApprovalAt = new Date();
      evciReq.parentApprovalBy = userId;
    }

    await evciReq.save();

    const eventType =
      action === 'approve' ? EventType.EVCI_REQUEST_APPROVED : EventType.EVCI_REQUEST_REJECTED;
    publishEvent(
      eventType,
      { studentId: evciReq.studentId, studentName: evciReq.studentName },
      evciReq.studentId,
    ).catch((err: unknown) =>
      logger.error('Async side-effect failed', {
        error: err instanceof Error ? err.message : err,
      }),
    );

    const pushTitle = action === 'approve' ? 'Evci Talebi Onaylandı' : 'Evci Talebi Reddedildi';
    const pushBody =
      action === 'approve'
        ? 'Evci talebiniz yönetici tarafından onaylandı.'
        : 'Evci talebiniz yönetici tarafından reddedildi.';
    PushNotificationService.sendToUser(evciReq.studentId, {
      title: pushTitle,
      body: pushBody,
      url: '/student/evci',
    }).catch((err: unknown) =>
      logger.error('Async side-effect failed', {
        error: err instanceof Error ? err.message : err,
      }),
    );

    return evciReq;
  }

  // -------------------------------------------------------------------------
  // Parent approval
  // -------------------------------------------------------------------------

  static async applyParentApproval(input: ParentApprovalInput): Promise<IEvciRequest> {
    const { id, action, reason, userId } = input;

    const evciReq = await EvciRequest.findById(id);
    if (!evciReq) {
      const err = Object.assign(new Error('Evci talebi bulunamadı'), { statusCode: 404 });
      throw err;
    }

    const childIds = await getParentChildIds(userId);
    if (!childIds.includes(evciReq.studentId)) {
      const err = Object.assign(new Error('Bu evci talebini onaylama/reddetme yetkiniz yok'), {
        statusCode: 403,
      });
      throw err;
    }

    if (evciReq.parentApproval !== 'pending') {
      const err = Object.assign(new Error('Bu talep zaten onaylanmış veya reddedilmiş'), {
        statusCode: 400,
      });
      throw err;
    }

    evciReq.parentApproval = action === 'approve' ? 'approved' : 'rejected';
    evciReq.parentApprovalAt = new Date();
    evciReq.parentApprovalBy = userId;

    if (action === 'reject') {
      evciReq.rejectionReason = reason || null;
    }

    await evciReq.save();

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

    const eventType =
      action === 'approve' ? EventType.EVCI_REQUEST_APPROVED : EventType.EVCI_REQUEST_REJECTED;
    publishEvent(
      eventType,
      { studentId: evciReq.studentId, studentName: evciReq.studentName },
      evciReq.studentId,
    ).catch((err: unknown) =>
      logger.error('Async side-effect failed', {
        error: err instanceof Error ? err.message : err,
      }),
    );

    const pushTitle = action === 'approve' ? 'Evci Talebi Onaylandı' : 'Evci Talebi Reddedildi';
    const pushBody =
      action === 'approve'
        ? 'Veliniz evci talebinizi onayladı.'
        : `Veliniz evci talebinizi reddetti.${reason ? ` Sebep: ${reason}` : ''}`;
    PushNotificationService.sendToUser(evciReq.studentId, {
      title: pushTitle,
      body: pushBody,
      url: '/student/evci',
    }).catch((err: unknown) =>
      logger.error('Async side-effect failed', {
        error: err instanceof Error ? err.message : err,
      }),
    );

    return evciReq;
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  static async deleteRequest(id: string): Promise<void> {
    await EvciRequest.findByIdAndDelete(id);
  }

  static async findById(id: string): Promise<IEvciRequest | null> {
    return EvciRequest.findById(id);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  static async updateRequest(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<IEvciRequest | null> {
    return EvciRequest.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  // -------------------------------------------------------------------------
  // Bulk status
  // -------------------------------------------------------------------------

  static async bulkUpdateStatus(
    ids: string[],
    status: 'approved' | 'rejected',
    adminNote: string | undefined,
    userId: string | undefined,
  ): Promise<{ modifiedCount: number; updatedRequests: IEvciRequest[] }> {
    const updateFields: Record<string, unknown> = {
      status,
      approvedBy: userId,
      approvedAt: new Date(),
    };
    if (adminNote) updateFields.adminNote = adminNote;

    if (status === 'approved') {
      updateFields.parentApproval = 'approved';
      updateFields.parentApprovalAt = new Date();
      updateFields.parentApprovalBy = userId;
    }

    const result = await EvciRequest.updateMany({ _id: { $in: ids } }, { $set: updateFields });
    const updatedRequests = await EvciRequest.find({ _id: { $in: ids } });

    return { modifiedCount: result.modifiedCount, updatedRequests };
  }

  // -------------------------------------------------------------------------
  // Window override
  // -------------------------------------------------------------------------

  static async setWindowOverride(
    weekOf: string,
    isOpen: boolean,
    reason: string | undefined,
    userId: string | undefined,
  ): Promise<InstanceType<typeof EvciWindowOverride>> {
    const override = await EvciWindowOverride.findOneAndUpdate(
      { weekOf },
      { isOpen, reason: reason || '', createdBy: userId },
      { upsert: true, new: true },
    );
    return override!;
  }
}
