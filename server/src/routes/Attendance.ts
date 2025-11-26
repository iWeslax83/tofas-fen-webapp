import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../utils/jwt';
import { requireRole } from '../middleware/auth';
import { Attendance } from '../models/Attendance';
import { User } from '../models/User';
import { AuditLogService } from '../services/auditLogService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Create attendance record
 * Teachers and admins can create attendance
 */
router.post(
  '/',
  authenticateJWT,
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      studentId,
      date,
      lesson,
      period,
      attendanceType,
      status,
      excuse,
      notes,
      semester,
      academicYear
    } = req.body;

    if (!studentId || !date || !attendanceType || !status) {
      return res.status(400).json({
        error: 'Öğrenci ID, tarih, yoklama türü ve durum gereklidir'
      });
    }

    // Get student info
    const student = await User.findOne({ id: studentId, rol: 'student' });
    if (!student) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı' });
    }

    // Get recorder info
    const recorder = (req as any).user;
    if (!recorder) {
      return res.status(401).json({ error: 'Kullanıcı bilgisi bulunamadı' });
    }

    // Check if attendance already exists for this student, date, and type
    const existingAttendance = await Attendance.findOne({
      studentId,
      date: new Date(date),
      attendanceType,
      lesson: lesson || undefined,
      period: period || undefined
    });

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      if (excuse) existingAttendance.excuse = excuse;
      if (notes) existingAttendance.notes = notes;
      existingAttendance.recordedBy = recorder.id;
      existingAttendance.recordedByName = recorder.adSoyad;
      await existingAttendance.save();

      // Log the update
      await AuditLogService.log(req, 'update', 'attendance', {
        resourceId: existingAttendance._id.toString(),
        details: { studentId, status, attendanceType }
      });

      return res.json({
        success: true,
        message: 'Yoklama kaydı güncellendi',
        attendance: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      studentId,
      studentName: student.adSoyad,
      date: new Date(date),
      lesson,
      period,
      attendanceType,
      status,
      excuse,
      recordedBy: recorder.id,
      recordedByName: recorder.adSoyad,
      notes,
      semester: semester || '1',
      academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    });

    await attendance.save();

    // Log the creation
    await AuditLogService.log(req, 'create', 'attendance', {
      resourceId: attendance._id.toString(),
      details: { studentId, status, attendanceType }
    });

    res.status(201).json({
      success: true,
      message: 'Yoklama kaydı oluşturuldu',
      attendance
    });
  })
);

/**
 * Bulk create attendance records (for class-wide attendance)
 */
router.post(
  '/bulk',
  authenticateJWT,
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      studentIds,
      date,
      lesson,
      period,
      attendanceType,
      statuses, // { studentId: 'present' | 'absent' | 'late' | 'excused' }
      semester,
      academicYear
    } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || !date || !attendanceType) {
      return res.status(400).json({
        error: 'Öğrenci ID listesi, tarih ve yoklama türü gereklidir'
      });
    }

    const recorder = (req as any).user;
    if (!recorder) {
      return res.status(401).json({ error: 'Kullanıcı bilgisi bulunamadı' });
    }

    const attendanceDate = new Date(date);
    const createdRecords = [];
    const updatedRecords = [];

    for (const studentId of studentIds) {
      const student = await User.findOne({ id: studentId, rol: 'student' });
      if (!student) continue;

      const status = statuses?.[studentId] || 'present';

      // Check if attendance already exists
      const existing = await Attendance.findOne({
        studentId,
        date: attendanceDate,
        attendanceType,
        lesson: lesson || undefined,
        period: period || undefined
      });

      if (existing) {
        existing.status = status;
        existing.recordedBy = recorder.id;
        existing.recordedByName = recorder.adSoyad;
        await existing.save();
        updatedRecords.push(existing);
      } else {
        const attendance = new Attendance({
          studentId,
          studentName: student.adSoyad,
          date: attendanceDate,
          lesson,
          period,
          attendanceType,
          status,
          recordedBy: recorder.id,
          recordedByName: recorder.adSoyad,
          semester: semester || '1',
          academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        });
        await attendance.save();
        createdRecords.push(attendance);
      }
    }

    // Log bulk operation
    await AuditLogService.log(req, 'create', 'attendance', {
      details: {
        count: createdRecords.length + updatedRecords.length,
        attendanceType,
        date: attendanceDate
      }
    });

    res.json({
      success: true,
      message: `${createdRecords.length} yeni kayıt oluşturuldu, ${updatedRecords.length} kayıt güncellendi`,
      created: createdRecords.length,
      updated: updatedRecords.length
    });
  })
);

/**
 * Get attendance records with filters
 */
router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      studentId,
      date,
      startDate,
      endDate,
      attendanceType,
      status,
      lesson,
      semester,
      academicYear,
      page = '1',
      limit = '50'
    } = req.query;

    const user = (req as any).user;
    const query: any = {};

    // Role-based filtering
    if (user.rol === 'student') {
      // Students can only see their own attendance
      query.studentId = user.id;
    } else if (user.rol === 'parent') {
      // Parents can see their children's attendance
      const parent = await User.findOne({ id: user.id });
      if (parent && parent.childId && parent.childId.length > 0) {
        query.studentId = { $in: parent.childId };
      } else {
        return res.json({ success: true, attendances: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
      }
    } else if (studentId) {
      // Teachers/admins can filter by student
      query.studentId = studentId;
    }

    if (date) {
      query.date = new Date(date as string);
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    if (attendanceType) query.attendanceType = attendanceType;
    if (status) query.status = status;
    if (lesson) query.lesson = lesson;
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1, studentId: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Attendance.countDocuments(query)
    ]);

    res.json({
      success: true,
      attendances,
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
 * Get attendance statistics for a student
 */
router.get(
  '/student/:studentId/stats',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { semester, academicYear } = req.query;

    const user = (req as any).user;

    // Check permissions
    if (user.rol === 'student' && user.id !== studentId) {
      return res.status(403).json({ error: 'Bu bilgiye erişim yetkiniz yok' });
    }

    if (user.rol === 'parent') {
      const parent = await User.findOne({ id: user.id });
      if (!parent || !parent.childId.includes(studentId)) {
        return res.status(403).json({ error: 'Bu bilgiye erişim yetkiniz yok' });
      }
    }

    const query: any = { studentId };
    if (semester) query.semester = semester;
    if (academicYear) query.academicYear = academicYear;

    const attendances = await Attendance.find(query).lean();

    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      late: attendances.filter(a => a.status === 'late').length,
      excused: attendances.filter(a => a.status === 'excused').length,
      byType: {
        ders: attendances.filter(a => a.attendanceType === 'ders').length,
        etut: attendances.filter(a => a.attendanceType === 'etut').length,
        gece_nobeti: attendances.filter(a => a.attendanceType === 'gece_nobeti').length
      }
    };

    res.json({
      success: true,
      stats
    });
  })
);

/**
 * Update attendance record
 */
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, excuse, notes } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ error: 'Yoklama kaydı bulunamadı' });
    }

    const recorder = (req as any).user;

    if (status) attendance.status = status;
    if (excuse !== undefined) attendance.excuse = excuse;
    if (notes !== undefined) attendance.notes = notes;
    attendance.recordedBy = recorder.id;
    attendance.recordedByName = recorder.adSoyad;

    await attendance.save();

    // Log the update
    await AuditLogService.log(req, 'update', 'attendance', {
      resourceId: id,
      details: { status, excuse }
    });

    res.json({
      success: true,
      message: 'Yoklama kaydı güncellendi',
      attendance
    });
  })
);

/**
 * Delete attendance record
 */
router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ error: 'Yoklama kaydı bulunamadı' });
    }

    await Attendance.findByIdAndDelete(id);

    // Log the deletion
    await AuditLogService.log(req, 'delete', 'attendance', {
      resourceId: id,
      details: { studentId: attendance.studentId }
    });

    res.json({
      success: true,
      message: 'Yoklama kaydı silindi'
    });
  })
);

export default router;

