import { Router } from 'express';
import { Request, Response } from 'express';
import Announcement from '../models/Announcement';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { validateAnnouncement } from '../middleware/validation';
import { User } from '../models/User';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all announcements with pagination
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of announcements
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const { page = '1', limit = '50' } = _req.query as { page?: string; limit?: string };
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const [announcements, total] = await Promise.all([
        Announcement.find().sort({ date: -1 }).skip(skip).limit(limitNum),
        Announcement.countDocuments(),
      ]);

      return res.json({
        data: announcements,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      logger.error('Duyuru getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

/**
 * @swagger
 * /api/announcements/role/{role}:
 *   get:
 *     summary: Get announcements filtered by role and class
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [student, parent, teacher, admin, hizmetli]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role-filtered announcements
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/role/:role',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { role } = req.params;
      const authUser = req.user;

      // Baz rol listesi
      const rolesToCheck = [role];

      // Veliler, kendi rollerine ek olarak öğrenciler için giden duyuruları da görebilsin
      if (role === 'parent') {
        rolesToCheck.push('student');
      }

      const roleFilter = {
        $or: [
          { targetRoles: { $exists: false } },
          { targetRoles: { $size: 0 } },
          { targetRoles: { $in: rolesToCheck } },
        ],
      };

      let classFilter: Record<string, unknown> | null = null;

      // Öğrenci için sınıf bazlı filtre
      if (role === 'student') {
        const student = (await User.findOne({ id: authUser?.userId })
          .select('sinif sube')
          .lean()) as any;
        const classCode =
          student?.sinif && student?.sube ? `${student.sinif}${student.sube}` : undefined;

        if (classCode) {
          classFilter = {
            $or: [
              { targetClasses: { $exists: false } },
              { targetClasses: { $size: 0 } },
              { targetClasses: classCode },
            ],
          };
        }
      }

      // Veli için çocukların sınıflarına göre filtre
      if (role === 'parent') {
        const parent = await User.findOne({ id: authUser?.userId }).select('childId').lean();

        if (
          parent &&
          Array.isArray((parent as Record<string, unknown>).childId) &&
          ((parent as Record<string, unknown>).childId as string[]).length
        ) {
          const children = await User.find({
            id: { $in: (parent as Record<string, unknown>).childId as string[] },
            rol: 'student',
          })
            .select('sinif sube')
            .lean();

          const classCodes = children
            .map((child) => (child.sinif && child.sube ? `${child.sinif}${child.sube}` : null))
            .filter((c): c is string => !!c);

          if (classCodes.length > 0) {
            classFilter = {
              $or: [
                { targetClasses: { $exists: false } },
                { targetClasses: { $size: 0 } },
                { targetClasses: { $in: classCodes } },
              ],
            };
          }
        }
      }

      const mongoFilter: Record<string, unknown> = classFilter
        ? { $and: [roleFilter, classFilter] }
        : roleFilter;

      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
      const skip = (page - 1) * limit;

      const [announcements, total] = await Promise.all([
        Announcement.find(mongoFilter).sort({ date: -1 }).skip(skip).limit(limit),
        Announcement.countDocuments(mongoFilter),
      ]);

      return res.json({
        data: announcements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('Rol bazli duyuru getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

/**
 * @swagger
 * /api/announcements/create:
 *   post:
 *     summary: Create a new announcement (teacher/admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               author:
 *                 type: string
 *               targetRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetClasses:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *     responses:
 *       201:
 *         description: Announcement created
 *       400:
 *         description: Missing title or content
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/create',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  validateAnnouncement,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { title, content, author, targetRoles, targetClasses, priority } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Başlık ve içerik gerekli' });
      }

      const announcement = new Announcement({
        title,
        content,
        author: author || 'Admin',
        authorId: req.user?.userId,
        date: new Date().toISOString(),
        targetRoles: targetRoles || [],
        targetClasses: targetClasses || [],
        priority: priority || 'medium',
      });

      await announcement.save();
      return res.status(201).json(announcement);
    } catch (error) {
      logger.error('Duyuru olusturma hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Duyuru oluştur (sadece öğretmen ve admin)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  validateAnnouncement,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { title, content, author } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Başlık ve içerik gerekli' });
      }

      const announcement = new Announcement({
        title,
        content,
        author: author || 'Admin',
        authorId: req.user?.userId,
        date: new Date().toISOString(),
      });

      await announcement.save();
      return res.status(201).json(announcement);
    } catch (error) {
      logger.error('Duyuru olusturma hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

/**
 * @swagger
 * /api/announcements/{id}:
 *   get:
 *     summary: Get a specific announcement by ID
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Announcement details
 *       404:
 *         description: Announcement not found
 */
router.get(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const announcement = await Announcement.findById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ error: 'Duyuru bulunamadı' });
      }
      return res.json(announcement);
    } catch (error) {
      logger.error('Duyuru getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

/**
 * @swagger
 * /api/announcements/{id}:
 *   put:
 *     summary: Update an announcement (owner or admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               targetRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Announcement updated
 *       403:
 *         description: Forbidden - not owner or admin
 *       404:
 *         description: Announcement not found
 */
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const authUser = req.user;
      const updateData = req.body;

      // Önce duyuruyu getir ve sahiplik kontrolü yap
      const existing = await Announcement.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Duyuru bulunamadı' });
      }

      // Sahiplik: authorId varsa kontrol et
      const isOwner = existing.authorId ? existing.authorId === authUser?.userId : false;
      if (!isOwner && authUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Bu duyuruyu güncelleme yetkiniz yok' });
      }

      const announcement = await Announcement.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
      return res.json(announcement);
    } catch (error) {
      logger.error('Duyuru guncelleme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

/**
 * @swagger
 * /api/announcements/{id}:
 *   delete:
 *     summary: Delete an announcement (owner or admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Announcement deleted
 *       403:
 *         description: Forbidden - not owner or admin
 *       404:
 *         description: Announcement not found
 */
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const authUser = req.user;

      // Önce duyuruyu getir ve sahiplik kontrolü yap
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ error: 'Duyuru bulunamadı' });
      }

      // Sahiplik: authorId varsa kontrol et
      const isOwner = announcement.authorId ? announcement.authorId === authUser?.userId : false;
      if (!isOwner && authUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Bu duyuruyu silme yetkiniz yok' });
      }

      await Announcement.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Duyuru silindi' });
    } catch (error) {
      logger.error('Duyuru silme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

export default router;
