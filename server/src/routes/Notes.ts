import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { verifyParentChildAccess } from '../middleware/parentChildAccess';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { NotesService } from '../services/NotesService';

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
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 500);

      const result = await NotesService.listNotes({
        role: req.user?.role,
        userId: req.user?.userId,
        studentId: studentId as string | undefined,
        lesson: lesson as string | undefined,
        semester: semester as string | undefined,
        academicYear: academicYear as string | undefined,
        source: source as string | undefined,
        gradeLevel: gradeLevel as string | undefined,
        classSection: classSection as string | undefined,
        page,
        limit,
      });

      if (result.earlyEmpty) {
        res.json([]);
        return;
      }

      res.json({
        success: true,
        data: result.notes,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total! / result.limit!),
        },
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

      const notes = await NotesService.getStudentNotes({
        studentId,
        semester: semester as string | undefined,
        academicYear: academicYear as string | undefined,
      });

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
      const note = await NotesService.createNote(req.body);
      res.status(201).json(note);
    } catch (error) {
      logger.error('Not ekleme hatasi', { error: error instanceof Error ? error.message : error });
      res
        .status(400)
        .json({ success: false, error: 'Not eklenemedi', details: (error as Error).message });
    }
  }),
);

// Registered before PUT /:id so Express does not match the literal
// "bulk-update" path segment as the :id route parameter.
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

      if (!Array.isArray(notes)) {
        res.status(400).json({ success: false, error: 'Notlar dizisi gerekli' });
        return;
      }

      const result = await NotesService.bulkUpdateNotes({
        notes,
        role: req.user?.role,
        userId: req.user?.userId,
      });

      res.json({
        success: true,
        updated: result.updated,
        notes: result.notes,
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
      const result = await NotesService.updateNote(id, req.body, req.user?.role, req.user?.userId);

      if (result.notFound) {
        res.status(404).json({ success: false, error: 'Not bulunamadı' });
        return;
      }
      if (result.forbidden) {
        res.status(403).json({ success: false, error: 'Bu notu güncelleme yetkiniz yok' });
        return;
      }

      res.json(result.note);
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
      const result = await NotesService.softDeleteNote(id);

      if ('notFound' in result) {
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

      const result = await NotesService.importExcelNotes({
        fileBuffer: req.file.buffer,
        originalname: req.file.originalname,
        semester,
        academicYear,
        source,
        role: authUser?.role,
        userId: authUser?.userId,
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
      });

      if (result.fileErrors) {
        res.status(400).json({ error: 'Dosyada hatalar var', errors: result.fileErrors });
        return;
      }
      if (result.invalidIds) {
        res
          .status(400)
          .json({ error: "Geçersiz öğrenci ID'leri var", invalidIds: result.invalidIds });
        return;
      }
      if (result.teacherRejection) {
        if (result.teacherRejection.reason === 'no_class') {
          res.status(403).json({
            error: 'Sınıfı atanmamış öğretmenler toplu not yükleyemez. Yöneticinize başvurun.',
          });
        } else {
          res.status(403).json({
            error: 'Bazı öğrenciler sınıfınıza ait değil. Yükleme reddedildi.',
            unauthorizedCount: result.teacherRejection.unauthorizedCount,
          });
        }
        return;
      }

      res.json({
        success: true,
        imported: result.imported,
        errors: result.errors,
        message: `${result.imported} not başarıyla içe aktarıldı`,
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

      const result = await NotesService.getStats({
        role: req.user?.role,
        userId: req.user?.userId,
        semester: semester as string | undefined,
        academicYear: academicYear as string | undefined,
        gradeLevel: gradeLevel as string | undefined,
        classSection: classSection as string | undefined,
      });

      if (result.earlyEmpty) {
        res.json([]);
        return;
      }

      res.json(result.stats);
    } catch (error) {
      logger.error('Istatistik hatasi', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'İstatistikler hesaplanamadı' });
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
      const templates = await NotesService.getTemplates();
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

      const result = await NotesService.searchNotes({
        q: String(q),
        role: req.user?.role,
        userId: req.user?.userId,
        semester: semester as string | undefined,
        academicYear: academicYear as string | undefined,
      });

      if (result.invalidQuery) {
        res
          .status(400)
          .json({ success: false, error: 'Arama terimi geçersiz veya çok uzun (≤100 karakter)' });
        return;
      }
      if (result.earlyEmpty) {
        res.json([]);
        return;
      }

      res.json(result.notes);
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

      const backupData = await NotesService.backupNotes({ semester, academicYear });

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
