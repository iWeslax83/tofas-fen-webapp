import { Router, Request, Response } from 'express';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { getParentChildIds, verifyParentChildAccess } from '../middleware/parentChildAccess';
import { AuditLogService } from '../services/auditLogService';
import { getWeekMonday } from '../models/EvciRequest';
import { EvciRequestService } from '../services/EvciRequestService';
import logger from '../utils/logger';

const router = Router();

// ============================================================
// Named routes MUST come before /:id routes (Express KRİTİK)
// ============================================================

/**
 * @swagger
 * /api/evci-requests/submission-window:
 *   get:
 *     summary: Get the current submission window status
 *     description: Returns whether the evci request submission window is open, with timing details
 *     tags: [EvciRequests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission window info including isOpen, windowStart, windowEnd, nextWindowStart
 *       401:
 *         description: Unauthorized
 */
router.get('/submission-window', authenticateJWT, async (_req: Request, res: Response) => {
  try {
    res.json(await EvciRequestService.getSubmissionWindowInfo());
  } catch (error) {
    logger.error('Error getting submission window', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Zaman penceresi bilgisi alınamadı' });
  }
});

/**
 * @swagger
 * /api/evci-requests/stats:
 *   get:
 *     summary: Get evci request statistics (admin/teacher only)
 *     tags: [EvciRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 8
 *           minimum: 1
 *           maximum: 52
 *         description: Number of weeks to include in stats
 *     responses:
 *       200:
 *         description: Summary, weekly trends, class distribution, parent approval stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/stats',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  async (req: Request, res: Response) => {
    try {
      const weeks = Math.min(Math.max(parseInt(req.query.weeks as string) || 8, 1), 52);
      res.json(await EvciRequestService.getStats(weeks));
    } catch (error) {
      logger.error('Error getting evci stats', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'İstatistikler alınamadı' });
    }
  },
);

/**
 * @swagger
 * /api/evci-requests/export:
 *   get:
 *     summary: Export evci requests as Excel or PDF (admin/teacher only)
 *     tags: [EvciRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf]
 *           default: excel
 *       - in: query
 *         name: weekOf
 *         schema:
 *           type: string
 *         description: Week start date (defaults to current week)
 *     responses:
 *       200:
 *         description: File download (xlsx or pdf)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/export',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string) || 'excel';
      const weekOf =
        (req.query.weekOf as string) ||
        getWeekMonday(
          (() => {
            const now = new Date();
            const turkeyOffset = 3 * 60 * 60 * 1000;
            return new Date(now.getTime() + turkeyOffset + now.getTimezoneOffset() * 60 * 1000);
          })(),
        );

      const rows = await EvciRequestService.buildExportRows(weekOf);

      if (format === 'pdf') {
        const buffer = await EvciRequestService.generatePdfExport(rows, weekOf);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=evci-${weekOf}.pdf`);
        res.send(buffer);
      } else {
        const buffer = await EvciRequestService.generateExcelExport(rows, weekOf);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename=evci-${weekOf}.xlsx`);
        res.send(buffer);
      }

      AuditLogService.log(req, 'export' as 'read', 'evci_request', {
        details: { format, weekOf, count: rows.length },
      });
    } catch (error) {
      logger.error('Error exporting evci requests', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Dışa aktarma sırasında hata oluştu' });
    }
  },
);

/**
 * @swagger
 * /api/evci-requests/bulk-status:
 *   post:
 *     summary: Bulk approve/reject evci requests (admin only)
 *     tags: [EvciRequests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, status]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 1000
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               adminNote:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Bulk update result with modified count
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/bulk-status',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req: Request, res: Response) => {
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
      const { modifiedCount, updatedRequests } = await EvciRequestService.bulkUpdateStatus(
        ids,
        status as 'approved' | 'rejected',
        adminNote,
        userId,
      );

      // Audit log + WS events (fire-and-forget)
      const { publishEvent } = await import('../utils/websocket-enhanced');
      const { EventType } = await import('../services/EventService');
      const { PushNotificationService } = await import('../services/pushNotificationService');

      for (const id of ids) {
        AuditLogService.log(req, status === 'approved' ? 'approve' : 'reject', 'evci_request', {
          resourceId: id,
          details: { bulkAction: true, adminNote },
        });
      }

      for (const evciReq of updatedRequests) {
        const eventType =
          status === 'approved' ? EventType.EVCI_REQUEST_APPROVED : EventType.EVCI_REQUEST_REJECTED;
        publishEvent(
          eventType,
          { studentId: evciReq.studentId, studentName: evciReq.studentName },
          evciReq.studentId,
        ).catch((err: unknown) =>
          logger.error('Async side-effect failed', {
            error: err instanceof Error ? err.message : err,
          }),
        );

        const bulkPushTitle =
          status === 'approved' ? 'Evci Talebi Onaylandı' : 'Evci Talebi Reddedildi';
        const bulkPushBody =
          status === 'approved'
            ? 'Evci talebiniz yönetici tarafından onaylandı.'
            : 'Evci talebiniz yönetici tarafından reddedildi.';
        PushNotificationService.sendToUser(evciReq.studentId, {
          title: bulkPushTitle,
          body: bulkPushBody,
          url: '/student/evci',
        }).catch((err: unknown) =>
          logger.error('Async side-effect failed', {
            error: err instanceof Error ? err.message : err,
          }),
        );
      }

      res.json({ modifiedCount });
    } catch (error) {
      logger.error('Error bulk updating evci requests', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Toplu güncelleme sırasında hata oluştu' });
    }
  },
);

// POST /window-override — Tatil/özel gün pencere override (admin)
router.post(
  '/window-override',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req: Request, res: Response) => {
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
      const override = await EvciRequestService.setWindowOverride(weekOf, isOpen, reason, userId);

      AuditLogService.log(req, 'update', 'evci_request', {
        details: { windowOverride: true, weekOf, isOpen, reason },
      });

      res.json(override);
    } catch (error) {
      logger.error('Error setting window override', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Pencere override ayarlanırken hata oluştu' });
    }
  },
);

// Tüm evci taleplerini getir (admin) — with pagination
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      res.json(await EvciRequestService.listAll(page, limit));
    } catch (error) {
      logger.error('Error fetching evci requests', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Evci talepleri alınamadı' });
    }
  },
);

// GET /parent/:parentId — Velinin çocuklarının talepleri
router.get('/parent/:parentId', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { parentId } = req.params;
    const role = req.user?.role;
    const userId = req.user?.userId;

    if (role === 'parent' && parentId !== userId) {
      return res
        .status(403)
        .json({ error: 'Sadece kendi çocuklarınızın taleplerini görebilirsiniz' });
    }
    if (role !== 'parent' && role !== 'admin' && role !== 'teacher') {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    res.json(await EvciRequestService.getParentRequests(parentId));
  } catch (error) {
    logger.error('Error fetching parent evci requests', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Veli evci talepleri alınamadı' });
  }
});

// Belirli bir öğrencinin evci talepleri - ownership check
router.get(
  '/student/:studentId',
  authenticateJWT,
  verifyParentChildAccess('params.studentId'),
  async (req, res) => {
    try {
      res.json(await EvciRequestService.getStudentRequests(req.params.studentId));
    } catch (error) {
      logger.error('Error fetching student evci requests', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Öğrenci evci talepleri alınamadı' });
    }
  },
);

// POST / — Yeni evci talebi oluştur
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['student', 'parent', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const { studentId, willGo, startDate, endDate, destination } = req.body;

      if (!studentId) {
        return res.status(400).json({ error: 'Öğrenci ID zorunludur' });
      }

      const role = req.user?.role;
      const userId = req.user?.userId;

      if (role === 'student' && studentId !== userId) {
        return res
          .status(403)
          .json({ error: 'Sadece kendi adınıza evci talebi oluşturabilirsiniz' });
      }
      if (role === 'parent') {
        const childIds = await getParentChildIds(userId!);
        if (!childIds.includes(studentId)) {
          return res
            .status(403)
            .json({ error: 'Bu öğrenci için evci talebi oluşturma yetkiniz yok' });
        }
      }

      if (role !== 'admin' && !(await EvciRequestService.isSubmissionWindowOpen())) {
        return res.status(400).json({
          error: 'Evci talepleri sadece Pazartesi-Perşembe arasında oluşturulabilir',
          submissionWindow: await EvciRequestService.getSubmissionWindowInfo(),
        });
      }

      if (willGo === undefined || willGo === null) {
        return res.status(400).json({ error: 'willGo alanı zorunludur' });
      }

      const willGoNormalized = willGo === true || willGo === 'true';

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

      let result;
      try {
        result = await EvciRequestService.createRequest({
          studentId,
          willGo,
          startDate,
          endDate,
          destination,
          userId,
        });
      } catch (createErr) {
        if (
          createErr instanceof Error &&
          (createErr as Error & { statusCode?: number }).statusCode === 409
        ) {
          return res.status(409).json({ error: createErr.message });
        }
        throw createErr;
      }

      AuditLogService.log(req, 'create', 'evci_request', {
        resourceId: String(result.request._id),
        details: { studentId, weekOf: result.request.weekOf, willGo: willGoNormalized },
      });

      res.status(201).json(result.request);
    } catch (error) {
      if (error instanceof Error && (error as Error & { code?: number }).code === 11000) {
        return res
          .status(409)
          .json({ error: 'Bu hafta için zaten bir evci talebiniz bulunmaktadır' });
      }
      logger.error('Error creating evci request', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Evci talebi oluşturulurken hata oluştu' });
    }
  },
);

// PATCH /:id/admin-approval — Admin bireysel onay/red
router.patch(
  '/:id/admin-approval',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { action, adminNote } = req.body;
      const userId = req.user?.userId;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "action alanı 'approve' veya 'reject' olmalıdır" });
      }
      if (adminNote && typeof adminNote === 'string' && adminNote.length > 500) {
        return res.status(400).json({ error: 'Admin notu en fazla 500 karakter olabilir' });
      }

      let evciReq;
      try {
        evciReq = await EvciRequestService.applyAdminApproval({
          id: req.params.id,
          action: action as 'approve' | 'reject',
          adminNote,
          userId,
        });
      } catch (err) {
        if (err instanceof Error && (err as Error & { statusCode?: number }).statusCode === 404) {
          return res.status(404).json({ error: err.message });
        }
        throw err;
      }

      AuditLogService.log(req, action === 'approve' ? 'approve' : 'reject', 'evci_request', {
        resourceId: String(evciReq._id),
        details: { studentId: evciReq.studentId, adminNote, individualAction: true },
      });

      res.json(evciReq);
    } catch (error) {
      logger.error('Error admin approving evci request', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Admin onayı güncellenirken hata oluştu' });
    }
  },
);

// PATCH /:id/parent-approval — Veli onay/red
router.patch(
  '/:id/parent-approval',
  authenticateJWT,
  authorizeRoles(['parent']),
  async (req: Request, res: Response) => {
    try {
      const { action, reason } = req.body;
      const userId = req.user?.userId;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: "action alanı 'approve' veya 'reject' olmalıdır" });
      }

      let evciReq;
      try {
        evciReq = await EvciRequestService.applyParentApproval({
          id: req.params.id,
          action: action as 'approve' | 'reject',
          reason,
          userId: userId!,
        });
      } catch (err) {
        const typed = err as Error & { statusCode?: number };
        if (typed.statusCode === 404) return res.status(404).json({ error: typed.message });
        if (typed.statusCode === 403) return res.status(403).json({ error: typed.message });
        if (typed.statusCode === 400) return res.status(400).json({ error: typed.message });
        throw err;
      }

      AuditLogService.log(req, action === 'approve' ? 'approve' : 'reject', 'evci_request', {
        resourceId: String(evciReq._id),
        details: { studentId: evciReq.studentId, reason },
      });

      res.json(evciReq);
    } catch (error) {
      logger.error('Error updating parent approval', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Veli onayı güncellenirken hata oluştu' });
    }
  },
);

// DELETE /:id — Evci talebini sil
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin', 'student', 'parent']),
  async (req, res) => {
    try {
      const evciReq = await EvciRequestService.findById(req.params.id);
      if (!evciReq) {
        return res.status(404).json({ error: 'Evci talebi bulunamadı' });
      }

      const role = req.user?.role;
      const userId = req.user?.userId;

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

      await EvciRequestService.deleteRequest(req.params.id);

      AuditLogService.log(req, 'delete', 'evci_request', {
        resourceId: req.params.id,
        details: { studentId: evciReq.studentId },
      });

      res.status(204).end();
    } catch (error) {
      logger.error('Error deleting evci request', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Evci talebi silinirken hata oluştu' });
    }
  },
);

// PATCH /:id — Evci talebini güncelle
router.patch(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin', 'student', 'parent']),
  async (req, res) => {
    try {
      const evciReq = await EvciRequestService.findById(req.params.id);
      if (!evciReq) {
        return res.status(404).json({ error: 'Evci talebi bulunamadı' });
      }

      const role = req.user?.role;
      const userId = req.user?.userId;

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

      const updateData = { ...req.body };
      if (role !== 'admin') {
        delete updateData.parentApproval;
        delete updateData.parentApprovalAt;
        delete updateData.parentApprovalBy;
        delete updateData.status;
        delete updateData.weekOf;
      }

      const updated = await EvciRequestService.updateRequest(req.params.id, updateData);

      AuditLogService.log(req, 'update', 'evci_request', {
        resourceId: req.params.id,
        details: { studentId: evciReq.studentId, updatedFields: Object.keys(updateData) },
      });

      res.json(updated);
    } catch (error) {
      logger.error('Error updating evci request', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Evci talebi güncellenirken hata oluştu' });
    }
  },
);

export default router;
