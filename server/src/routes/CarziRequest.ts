import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../utils/jwt';
import { requireRole } from '../middleware/auth';
import { CarziRequest } from '../models/CarziRequest';
import { User } from '../models/User';
import { AuditLogService } from '../services/auditLogService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Create çarşı izni request
 * Students can create requests
 */
router.post(
  '/',
  authenticateJWT,
  requireRole(['student']),
  asyncHandler(async (req: Request, res: Response) => {
    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime) {
      res.status(400).json({
        error: 'Tarih, başlangıç saati ve bitiş saati gereklidir'
      });
      return;
    }

    const user = (req as any).user;
    if (!user || user.rol !== 'student') {
      res.status(403).json({ error: 'Sadece öğrenciler çarşı izni talep edebilir' });
      return;
    }

    // Check if student is in dormitory
    const student = await User.findOne({ id: user.id });
    if (!student || !student.pansiyon) {
      res.status(400).json({ error: 'Sadece pansiyon öğrencileri çarşı izni talep edebilir' });
      return;
    }

    // Check if there's already a pending request for this date
    const existingRequest = await CarziRequest.findOne({
      studentId: user.id,
      date,
      status: 'pending'
    });

    if (existingRequest) {
      res.status(400).json({ error: 'Bu tarih için zaten bekleyen bir izin talebiniz var' });
      return;
    }

    const carziRequest = new CarziRequest({
      studentId: user.id,
      studentName: user.adSoyad,
      date,
      startTime,
      endTime,
      reason,
      status: 'pending',
      parentApproval: 'pending'
    });

    await carziRequest.save();

    // Log the creation
    await AuditLogService.log(req, 'create', 'carzi_request', {
      resourceId: carziRequest._id.toString(),
      details: { studentId: user.id, date }
    });

    res.status(201).json({
      success: true,
      message: 'Çarşı izni talebi oluşturuldu',
      request: carziRequest
    });
  })
);

/**
 * Get çarşı izni requests
 */
router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId, status, parentApproval, date, page = '1', limit = '50' } = req.query;

    const user = (req as any).user;
    const query: any = {};

    // Role-based filtering
    if (user.rol === 'student') {
      // Students can only see their own requests
      query.studentId = user.id;
    } else if (user.rol === 'parent') {
      // Parents can see their children's requests
      const parent = await User.findOne({ id: user.id });
      if (parent && parent.childId && parent.childId.length > 0) {
        query.studentId = { $in: parent.childId };
      } else {
        res.json({ success: true, requests: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
        return;
      }
    } else if (studentId) {
      // Teachers/admins can filter by student
      query.studentId = studentId;
    }

    if (status) query.status = status;
    if (parentApproval) query.parentApproval = parentApproval;
    if (date) query.date = date;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      CarziRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CarziRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  })
);

/**
 * Parent approval for çarşı izni
 */
router.post(
  '/:id/parent-approval',
  authenticateJWT,
  requireRole(['parent']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approved } = req.body; // true or false

    const parent = (req as any).user;
    const request = await CarziRequest.findById(id);

    if (!request) {
      res.status(404).json({ error: 'İzin talebi bulunamadı' });
      return;
    }

    // Check if parent is authorized (has this student as child)
    const parentUser = await User.findOne({ id: parent.id });
    if (!parentUser || !parentUser.childId.includes(request.studentId)) {
      res.status(403).json({ error: 'Bu öğrencinin velisi değilsiniz' });
      return;
    }

    request.parentApproval = approved ? 'approved' : 'rejected';
    request.parentApprovedBy = parent.id;
    request.parentApprovedAt = new Date();

    await request.save();

    // Log the approval
    await AuditLogService.log(req, approved ? 'approve' : 'reject', 'carzi_request', {
      resourceId: id,
      details: { studentId: request.studentId, approved }
    });

    res.json({
      success: true,
      message: approved ? 'İzin talebi onaylandı' : 'İzin talebi reddedildi',
      request
    });
  })
);

/**
 * Admin approval for çarşı izni
 */
router.post(
  '/:id/approve',
  authenticateJWT,
  requireRole(['admin', 'teacher']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approved, adminNote } = req.body;

    const admin = (req as any).user;
    const request = await CarziRequest.findById(id);

    if (!request) {
      res.status(404).json({ error: 'İzin talebi bulunamadı' });
      return;
    }

    // Check if parent has approved (if required)
    if (request.parentApproval !== 'approved') {
      res.status(400).json({ error: 'Veli onayı bekleniyor' });
      return;
    }

    request.status = approved ? 'approved' : 'rejected';
    request.approvedBy = admin.id;
    request.approvedAt = new Date();
    if (adminNote) request.adminNote = adminNote;

    await request.save();

    // Log the approval
    await AuditLogService.log(req, approved ? 'approve' : 'reject', 'carzi_request', {
      resourceId: id,
      details: { studentId: request.studentId, approved, adminNote }
    });

    res.json({
      success: true,
      message: approved ? 'İzin talebi onaylandı' : 'İzin talebi reddedildi',
      request
    });
  })
);

/**
 * Update çarşı izni request (only by student, if pending)
 */
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['student']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { date, startTime, endTime, reason } = req.body;

    const user = (req as any).user;
    const request = await CarziRequest.findById(id);

    if (!request) {
      res.status(404).json({ error: 'İzin talebi bulunamadı' });
      return;
    }

    if (request.studentId !== user.id) {
      res.status(403).json({ error: 'Bu izin talebini düzenleme yetkiniz yok' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ error: 'Sadece bekleyen talepler düzenlenebilir' });
      return;
    }

    if (date) request.date = date;
    if (startTime) request.startTime = startTime;
    if (endTime) request.endTime = endTime;
    if (reason !== undefined) request.reason = reason;

    await request.save();

    // Log the update
    await AuditLogService.log(req, 'update', 'carzi_request', {
      resourceId: id,
      details: { date, startTime, endTime }
    });

    res.json({
      success: true,
      message: 'İzin talebi güncellendi',
      request
    });
  })
);

/**
 * Delete çarşı izni request (only by student, if pending)
 */
router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['student']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = (req as any).user;
    const request = await CarziRequest.findById(id);

    if (!request) {
      res.status(404).json({ error: 'İzin talebi bulunamadı' });
      return;
    }

    if (request.studentId !== user.id) {
      res.status(403).json({ error: 'Bu izin talebini silme yetkiniz yok' });
      return;
    }

    if (request.status !== 'pending') {
      res.status(400).json({ error: 'Sadece bekleyen talepler silinebilir' });
      return;
    }

    await CarziRequest.findByIdAndDelete(id);

    // Log the deletion
    await AuditLogService.log(req, 'delete', 'carzi_request', {
      resourceId: id,
      details: { studentId: request.studentId }
    });

    res.json({
      success: true,
      message: 'İzin talebi silindi'
    });
  })
);

export default router;

