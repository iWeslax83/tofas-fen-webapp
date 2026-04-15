import { Router } from 'express';
import Note, { INote } from '../models/Note';
import { ExcelImportService } from '../services/excelImportService';
import { Request, Response } from 'express';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { User } from '../models';
import { getParentChildIds, verifyParentChildAccess } from '../middleware/parentChildAccess';
import { MongoFilter } from '../types';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { logSecurityEvent, SecurityEvent } from '../utils/securityLogger';

/** Shape of a note update entry in bulk-update */
interface NoteUpdateEntry {
  id: string;
  [key: string]: unknown;
}

const router = Router();

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes (grades) with filtering
 *     description: Returns paginated notes with role-based access. Students see only their own, parents see linked children's, teachers/admins see all with optional filters.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID (teacher/admin only)
 *       - in: query
 *         name: lesson
 *         schema:
 *           type: string
 *         description: Filter by lesson/subject name
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter by semester
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year (e.g. "2025-2026")
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source (manual, excel)
 *       - in: query
 *         name: gradeLevel
 *         schema:
 *           type: string
 *         description: Filter by grade level
 *       - in: query
 *         name: classSection
 *         schema:
 *           type: string
 *         description: Filter by class section
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Items per page (max 500)
 *     responses:
 *       200:
 *         description: Paginated list of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { studentId, lesson, semester, academicYear, source, gradeLevel, classSection } =
        req.query;

      const filter: MongoFilter<INote> = { isActive: true };
      const role = req.user?.role;
      const userId = req.user?.userId;

      // Role-based filtering - enforce server-side data access control
      if (role === 'student') {
        filter.studentId = userId;
      } else if (role === 'parent') {
        const childIds = await getParentChildIds(userId!);
        if (childIds.length === 0) {
          res.json([]);
          return;
        }
        filter.studentId = { $in: childIds };
      } else {
        // Teacher/Admin - allow query param filtering
        if (studentId) filter.studentId = studentId;
      }

      if (lesson) filter.lesson = lesson;
      if (semester) filter.semester = semester;
      if (academicYear) filter.academicYear = academicYear;
      if (source) filter.source = source;
      if (gradeLevel) filter.gradeLevel = gradeLevel;
      if (classSection) filter.classSection = classSection;

      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);
      const skip = (page - 1) * limit;

      const [notes, total] = await Promise.all([
        Note.find(filter).sort({ lastUpdated: -1 }).skip(skip).limit(limit).lean(),
        Note.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: notes,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('Notlari getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, error: 'Notlar getirilemedi' });
    }
  }),
);

/**
 * @swagger
 * /api/notes/student/{studentId}:
 *   get:
 *     summary: Get notes for a specific student
 *     description: Returns all active notes for a student. Requires ownership or parent-child access verification.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter by semester
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *     responses:
 *       200:
 *         description: List of student notes sorted by lesson
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - no access to this student's notes
 *       500:
 *         description: Internal server error
 */
router.get(
  '/student/:studentId',
  authenticateJWT,
  verifyParentChildAccess('params.studentId'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { studentId } = req.params;
      const { semester, academicYear } = req.query;

      const filter: any = {
        studentId,
        isActive: true,
      };

      if (semester) filter.semester = semester;
      if (academicYear) filter.academicYear = academicYear;

      const notes = await Note.find(filter).sort({ lesson: 1, lastUpdated: -1 }).lean();

      res.json(notes);
    } catch (error) {
      logger.error('Ogrenci notlari getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ success: false, error: 'Öğrenci notları getirilemedi' });
    }
  }),
);

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a new note (grade)
 *     description: Manually add a note/grade for a student. Teacher and admin only. Source is set to 'manual'.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *               lesson:
 *                 type: string
 *               grade:
 *                 type: number
 *               semester:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               description:
 *                 type: string
 *               gradeLevel:
 *                 type: string
 *               classSection:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires teacher or admin role
 */
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const noteData = req.body;
      noteData.source = 'manual';

      const note = new Note(noteData);
      await note.save();

      res.status(201).json(note);
    } catch (error) {
      logger.error('Not ekleme hatasi', { error: error instanceof Error ? error.message : error });
      res
        .status(400)
        .json({ success: false, error: 'Not eklenemedi', details: (error as Error).message });
    }
  }),
);

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update a note
 *     description: Update an existing note/grade. Only the creator (teacher) or admin can update.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Note MongoDB _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grade:
 *                 type: number
 *               lesson:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated note
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the note creator or admin
 *       404:
 *         description: Note not found
 */
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const authUser = req.user;

      // Önce notu getir ve sahiplik kontrolü yap
      const existingNote = await Note.findById(id);
      if (!existingNote) {
        res.status(404).json({ success: false, error: 'Not bulunamadı' });
        return;
      }

      // Sadece notu oluşturan öğretmen veya admin güncelleyebilir
      if (
        authUser?.role !== 'admin' &&
        (existingNote as any).createdBy &&
        (existingNote as any).createdBy !== authUser?.userId
      ) {
        res.status(403).json({ success: false, error: 'Bu notu güncelleme yetkiniz yok' });
        return;
      }

      const note = await Note.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

      res.json(note);
    } catch (error) {
      logger.error('Not guncelleme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res
        .status(400)
        .json({ success: false, error: 'Not güncellenemedi', details: (error as Error).message });
    }
  }),
);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Soft-delete a note
 *     description: Sets isActive to false instead of permanently deleting. Teacher and admin only.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Note MongoDB _id
 *     responses:
 *       200:
 *         description: Note soft-deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires teacher or admin role
 *       404:
 *         description: Note not found
 */
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const note = await Note.findByIdAndUpdate(id, { isActive: false }, { new: true });

      if (!note) {
        res.status(404).json({ success: false, error: 'Not bulunamadı' });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Not silme hatasi', { error: error instanceof Error ? error.message : error });
      res
        .status(400)
        .json({ success: false, error: 'Not silinemedi', details: (error as Error).message });
    }
  }),
);

/**
 * @swagger
 * /api/notes/import-excel:
 *   post:
 *     summary: Import notes from Excel file
 *     description: Upload an Excel file to bulk-import student grades. Validates student IDs and note data before inserting. Teacher and admin only.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - semester
 *               - academicYear
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file with note data
 *               semester:
 *                 type: string
 *                 description: Semester identifier
 *               academicYear:
 *                 type: string
 *                 description: Academic year (e.g. "2025-2026")
 *               source:
 *                 type: string
 *                 description: Source label (defaults to 'excel')
 *     responses:
 *       200:
 *         description: Import result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 imported:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: No file uploaded, missing fields, or validation errors
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires teacher or admin role
 *       500:
 *         description: Internal server error
 */
router.post(
  '/import-excel',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const authUser = (req as Request & { user?: { userId: string; role: string } }).user;
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Dosya yüklenmedi' });
        return;
      }

      const { semester, academicYear, source } = req.body;

      if (!semester || !academicYear) {
        res.status(400).json({ success: false, error: 'Dönem ve akademik yıl bilgisi gerekli' });
        return;
      }

      // Excel dosyasını parse et
      const notes = ExcelImportService.parseFileByExtension(req.file.buffer, req.file.originalname);

      // Not verilerini doğrula
      const validation = ExcelImportService.validateNoteData(notes);

      if (validation.errors.length > 0) {
        res.status(400).json({
          error: 'Dosyada hatalar var',
          errors: validation.errors,
        });
        return;
      }

      // Öğrenci ID'lerini doğrula
      const studentIds = validation.valid.map((note) => note.studentId);
      const studentValidation = await ExcelImportService.validateStudentIds(studentIds);

      if (studentValidation.invalid.length > 0) {
        res.status(400).json({
          error: "Geçersiz öğrenci ID'leri var",
          invalidIds: studentValidation.invalid,
        });
        return;
      }

      // F-C3: defense in depth — teachers can only import grades for students
      // in their own assigned `sinif`. Admins are unrestricted. The data model
      // currently stores a single `sinif` per teacher; if a teacher teaches
      // multiple grades they must use the admin import path. Without this
      // check, a teacher could replay a forged request and grade students
      // they have no business grading.
      if (authUser?.role === 'teacher') {
        const teacher = (await User.findOne({ id: authUser.userId, rol: 'teacher' })
          .select('sinif sube')
          .lean()) as { sinif?: string; sube?: string } | null;
        if (!teacher?.sinif) {
          logSecurityEvent({
            event: SecurityEvent.NOTES_BULK_IMPORT_REJECTED,
            userId: authUser.userId,
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
            details: { reason: 'teacher_has_no_assigned_class', count: studentIds.length },
          });
          res.status(403).json({
            error: 'Sınıfı atanmamış öğretmenler toplu not yükleyemez. Yöneticinize başvurun.',
          });
          return;
        }
        const ownedStudents = await User.find({
          id: { $in: studentIds },
          rol: 'student',
          sinif: teacher.sinif,
        })
          .select('id')
          .lean();
        const ownedIds = new Set(ownedStudents.map((s) => s.id));
        const unauthorized = studentIds.filter((id) => !ownedIds.has(id));
        if (unauthorized.length > 0) {
          logSecurityEvent({
            event: SecurityEvent.NOTES_BULK_IMPORT_REJECTED,
            userId: authUser.userId,
            ip: req.ip,
            userAgent: req.get('user-agent') || undefined,
            details: {
              reason: 'student_outside_teacher_class',
              teacherSinif: teacher.sinif,
              unauthorizedCount: unauthorized.length,
              // Don't log every studentId; cap the sample to avoid log bloat.
              sample: unauthorized.slice(0, 10),
            },
          });
          res.status(403).json({
            error: 'Bazı öğrenciler sınıfınıza ait değil. Yükleme reddedildi.',
            unauthorizedCount: unauthorized.length,
          });
          return;
        }
      }

      // Notları veritabanına toplu kaydet (insertMany ile performans optimizasyonu)
      const noteDocs = validation.valid.map((noteData) => ({
        studentId: noteData.studentId,
        lesson: noteData.subject,
        grade: noteData.note,
        date: new Date(noteData.date),
        description: noteData.description,
        semester,
        academicYear,
        source: source || 'excel',
        isActive: true,
      }));
      const savedNotes = await Note.insertMany(noteDocs, { ordered: false });

      // F-C3: audit-log every successful bulk import. Includes the importer's
      // role so a query like `event=NOTES_BULK_IMPORT AND role=teacher` is
      // possible from the security log.
      logSecurityEvent({
        event: SecurityEvent.NOTES_BULK_IMPORT,
        userId: authUser?.userId,
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        details: {
          role: authUser?.role,
          imported: savedNotes.length,
          semester,
          academicYear,
          source: source || 'excel',
          uniqueStudents: new Set(studentIds).size,
        },
      });

      res.json({
        success: true,
        imported: savedNotes.length,
        errors: validation.errors,
        message: `${savedNotes.length} not başarıyla içe aktarıldı`,
      });
    } catch (error) {
      logger.error('Excel import hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({
        success: false,
        error: 'Excel dosyası işlenemedi',
        details: (error as Error).message,
      });
    }
  }),
);

/**
 * @swagger
 * /api/notes/stats:
 *   get:
 *     summary: Get note statistics (aggregated)
 *     description: Returns aggregated grade statistics grouped by lesson, semester, and academic year. Role-based filtering applies.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter by semester
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *       - in: query
 *         name: gradeLevel
 *         schema:
 *           type: string
 *         description: Filter by grade level
 *       - in: query
 *         name: classSection
 *         schema:
 *           type: string
 *         description: Filter by class section
 *     responses:
 *       200:
 *         description: Aggregated statistics per lesson
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: object
 *                     properties:
 *                       lesson:
 *                         type: string
 *                       semester:
 *                         type: string
 *                       academicYear:
 *                         type: string
 *                   count:
 *                     type: integer
 *                   avgGrade:
 *                     type: number
 *                   minGrade:
 *                     type: number
 *                   maxGrade:
 *                     type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/stats',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { semester, academicYear, gradeLevel, classSection } = req.query;
      const role = req.user?.role;
      const userId = req.user?.userId;

      const filter: any = { isActive: true };

      // Role-based filtering
      if (role === 'student') {
        filter.studentId = userId;
      } else if (role === 'parent') {
        const childIds = await getParentChildIds(userId!);
        if (childIds.length === 0) {
          res.json([]);
          return;
        }
        filter.studentId = { $in: childIds };
      }

      if (semester) filter.semester = semester;
      if (academicYear) filter.academicYear = academicYear;
      if (gradeLevel) filter.gradeLevel = gradeLevel;
      if (classSection) filter.classSection = classSection;

      const stats = await Note.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              lesson: '$lesson',
              semester: '$semester',
              academicYear: '$academicYear',
            },
            count: { $sum: 1 },
            avgGrade: { $avg: '$grade' },
            minGrade: { $min: '$grade' },
            maxGrade: { $max: '$grade' },
          },
        },
        { $sort: { '_id.lesson': 1 } },
      ]);

      res.json(stats);
    } catch (error) {
      logger.error('Istatistik hatasi', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'İstatistikler hesaplanamadı' });
    }
  }),
);

/**
 * @swagger
 * /api/notes/bulk-update:
 *   put:
 *     summary: Bulk update multiple notes
 *     description: Update multiple notes at once. Non-admin users can only update notes they created. Teacher and admin only.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notes
 *             properties:
 *               notes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Note MongoDB _id
 *                     grade:
 *                       type: number
 *                     lesson:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk update result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updated:
 *                   type: integer
 *                 notes:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Notes array is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires teacher or admin role
 *       500:
 *         description: Internal server error
 */
router.put(
  '/bulk-update',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { notes } = req.body;
      const authUser = req.user;

      if (!Array.isArray(notes)) {
        res.status(400).json({ success: false, error: 'Notlar dizisi gerekli' });
        return;
      }

      const updatePromises = notes.map(async (noteUpdate: any) => {
        const { id, ...updateData } = noteUpdate;

        // Sahiplik kontrolü: admin değilse, notu oluşturan kişi mi kontrol et
        if (authUser?.role !== 'admin') {
          const existingNote = await Note.findById(id);
          if (
            existingNote &&
            (existingNote as any).createdBy &&
            (existingNote as any).createdBy !== authUser?.userId
          ) {
            return null; // Yetkisiz notları atla
          }
        }

        return Note.findByIdAndUpdate(id, updateData, { new: true });
      });

      const results = await Promise.all(updatePromises);
      const updatedNotes = results.filter(Boolean);

      res.json({
        success: true,
        updated: updatedNotes.length,
        notes: updatedNotes,
      });
    } catch (error) {
      logger.error('Toplu guncelleme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({
        success: false,
        error: 'Notlar güncellenemedi',
        details: (error as Error).message,
      });
    }
  }),
);

/**
 * @swagger
 * /api/notes/templates:
 *   get:
 *     summary: Get distinct lesson names (templates)
 *     description: Returns a list of all distinct lesson names that have notes in the system.
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of distinct lesson names
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/templates',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const templates = await Note.distinct('lesson');
      res.json(templates);
    } catch (error) {
      logger.error('Sablon hatasi', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'Şablonlar getirilemedi' });
    }
  }),
);

// Not arama - requires authentication
router.get(
  '/search',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { q, semester, academicYear } = req.query;

      if (!q) {
        res.status(400).json({ success: false, error: 'Arama terimi gerekli' });
        return;
      }

      const role = req.user?.role;
      const userId = req.user?.userId;

      const filter: any = {
        isActive: true,
        $or: [
          { studentId: { $regex: q, $options: 'i' } },
          { lesson: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
        ],
      };

      // Role-based filtering
      if (role === 'student') {
        filter.studentId = userId;
      } else if (role === 'parent') {
        const childIds = await getParentChildIds(userId!);
        if (childIds.length === 0) {
          res.json([]);
          return;
        }
        filter.studentId = { $in: childIds };
      }

      if (semester) filter.semester = semester;
      if (academicYear) filter.academicYear = academicYear;

      const notes = await Note.find(filter).sort({ lastUpdated: -1 }).limit(50).lean();

      res.json(notes);
    } catch (error) {
      logger.error('Arama hatasi', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'Arama yapılamadı' });
    }
  }),
);

// Not yedekleme - requires admin authentication
router.post(
  '/backup',
  authenticateJWT,
  authorizeRoles(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { semester, academicYear } = req.body;

      if (!semester || !academicYear) {
        res.status(400).json({ success: false, error: 'Dönem ve akademik yıl gerekli' });
        return;
      }

      const notes = await Note.find({
        semester,
        academicYear,
        isActive: true,
      }).lean();

      const backupData = {
        timestamp: new Date(),
        semester,
        academicYear,
        count: notes.length,
        notes,
      };

      // Burada backup dosyası oluşturulabilir
      // Örneğin: fs.writeFileSync(`backup-${semester}-${academicYear}.json`, JSON.stringify(backupData));

      res.json({
        success: true,
        backup: backupData,
      });
    } catch (error) {
      logger.error('Yedekleme hatasi', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'Yedekleme yapılamadı' });
    }
  }),
);

export default router;
