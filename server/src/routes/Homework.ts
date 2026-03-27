import { Router } from 'express';
import { Homework, IHomework } from '../models/Homework';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { validateHomework } from '../middleware/validation';
import { User } from '../models';
import { getParentChildIds } from '../middleware/parentChildAccess';
import { MongoFilter } from '../types';
import logger from '../utils/logger';

/** Lean User shape for student/child lookups */
interface LeanStudentInfo {
  sinif?: string;
  sube?: string;
}

/** Partial fields allowed in homework updates */
interface HomeworkUpdateFields {
  updatedAt: Date;
  title?: string;
  description?: string;
  subject?: string;
  assignedDate?: Date;
  dueDate?: Date;
  attachments?: string[];
  classLevel?: string;
  classSection?: string;
}

const router = Router();

/**
 * @swagger
 * /api/homeworks:
 *   get:
 *     summary: Get all homeworks with filtering
 *     description: Returns paginated homeworks filtered by role. Students see their own class, parents see linked children's classes, teachers see their own unless filtered, admins see all.
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject name
 *       - in: query
 *         name: classLevel
 *         schema:
 *           type: string
 *         description: Filter by class level (e.g. "9", "10")
 *       - in: query
 *         name: classSection
 *         schema:
 *           type: string
 *         description: Filter by class section (e.g. "A", "B")
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *         description: Filter by teacher ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, expired]
 *         description: Filter by homework status
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
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of homeworks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 homeworks:
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
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const {
      subject,
      classLevel,
      classSection,
      teacherId,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: MongoFilter<IHomework> = {};
    const role = req.user?.role;
    const userId = req.user?.userId;

    // Rol bazlı filtreleme
    if (role === 'student') {
      // Öğrenci sadece kendi sınıfının ödevlerini görebilir
      const student = (await User.findOne({ id: userId })
        .select('sinif sube')
        .lean()) as LeanStudentInfo | null;
      if (student?.sinif) {
        filter.classLevel = student.sinif;
        if (student.sube) filter.classSection = student.sube;
      }
    } else if (role === 'parent') {
      // Veli sadece çocuklarının sınıflarının ödevlerini görebilir
      const childIds = await getParentChildIds(userId!);
      if (childIds.length === 0) {
        return res.json({
          homeworks: [],
          pagination: { page: 1, limit: Number(limit), total: 0, pages: 0 },
        });
      }
      const children = (await User.find({ id: { $in: childIds } })
        .select('sinif sube')
        .lean()) as LeanStudentInfo[];
      const levels = [...new Set(children.map((c) => c.sinif).filter(Boolean))];
      const sections = [...new Set(children.map((c) => c.sube).filter(Boolean))];
      if (levels.length > 0) filter.classLevel = { $in: levels };
      if (sections.length > 0) filter.classSection = { $in: sections };
    } else if (role === 'teacher') {
      // Öğretmen kendi ödevlerini veya query param ile filtre uygulayabilir
      if (!classLevel && !classSection && !teacherId) {
        filter.teacherId = userId;
      }
    }
    // Admin: tüm filtreleri query param ile uygulayabilir

    if (subject) filter.subject = subject;
    if (classLevel && !filter.classLevel) filter.classLevel = classLevel;
    if (classSection && !filter.classSection) filter.classSection = classSection;
    if (teacherId) filter.teacherId = teacherId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const homeworks = await Homework.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Homework.countDocuments(filter);

    // Tarihleri ISO string formatına dönüştür
    const formattedHomeworks = homeworks.map((hw) => ({
      ...hw,
      assignedDate: hw.assignedDate ? new Date(hw.assignedDate).toISOString() : undefined,
      dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString() : undefined,
      createdAt: hw.createdAt ? new Date(hw.createdAt).toISOString() : undefined,
      updatedAt: hw.updatedAt ? new Date(hw.updatedAt).toISOString() : undefined,
    }));

    res.json({
      homeworks: formattedHomeworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Homework fetch error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödevler getirilirken hata oluştu' });
  }
});

/**
 * @swagger
 * /api/homeworks/{id}:
 *   get:
 *     summary: Get a specific homework by ID
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Homework ID (custom id or MongoDB _id)
 *     responses:
 *       200:
 *         description: Homework details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Homework not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    let homework: any = await Homework.findOne({ id: req.params.id }).lean();
    if (!homework) {
      homework = await Homework.findById(req.params.id).lean();
    }

    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Tarihleri ISO string formatına dönüştür
    const formattedHomework = {
      ...homework,
      assignedDate: homework.assignedDate
        ? new Date(homework.assignedDate).toISOString()
        : undefined,
      dueDate: homework.dueDate ? new Date(homework.dueDate).toISOString() : undefined,
      createdAt: homework.createdAt ? new Date(homework.createdAt).toISOString() : undefined,
      updatedAt: homework.updatedAt ? new Date(homework.updatedAt).toISOString() : undefined,
    };

    res.json(formattedHomework);
  } catch (error) {
    logger.error('Homework fetch error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Ödev getirilirken hata oluştu' });
  }
});

/**
 * @swagger
 * /api/homeworks:
 *   post:
 *     summary: Create a new homework
 *     description: Only teachers and admins can create homeworks. The teacherId is set from the authenticated user.
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - subject
 *               - classLevel
 *               - dueDate
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               classLevel:
 *                 type: string
 *               classSection:
 *                 type: string
 *               assignedDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Homework created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires teacher or admin role
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  validateHomework,
  async (req, res) => {
    try {
      const {
        title,
        description,
        subject,
        classLevel,
        classSection,
        assignedDate,
        dueDate,
        attachments,
      } = req.body;

      // Look up teacher name from DB
      const teacher = (await User.findOne({ id: req.user.userId }).select('adSoyad').lean()) as {
        adSoyad?: string;
      } | null;

      const newHomework = new Homework({
        id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description,
        subject,
        teacherId: req.user.userId,
        teacherName: teacher?.adSoyad || 'Bilinmeyen Öğretmen',
        classLevel,
        classSection,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        dueDate: new Date(dueDate),
        attachments: attachments || [],
        status: 'active',
        isPublished: true,
      });

      const savedHomework = await newHomework.save();

      // Tarihleri ISO string formatına dönüştür
      const formattedHomework = {
        ...savedHomework.toObject(),
        assignedDate: savedHomework.assignedDate
          ? new Date(savedHomework.assignedDate).toISOString()
          : undefined,
        dueDate: savedHomework.dueDate ? new Date(savedHomework.dueDate).toISOString() : undefined,
        createdAt: savedHomework.createdAt
          ? new Date(savedHomework.createdAt).toISOString()
          : undefined,
        updatedAt: savedHomework.updatedAt
          ? new Date(savedHomework.updatedAt).toISOString()
          : undefined,
      };

      res.status(201).json(formattedHomework);
    } catch (error) {
      logger.error('Homework creation error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Ödev oluşturulurken hata oluştu' });
    }
  },
);

/**
 * @swagger
 * /api/homeworks/create:
 *   post:
 *     summary: Create a new homework (legacy endpoint)
 *     description: Alias for POST /api/homeworks. Only teachers and admins can create homeworks.
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - subject
 *               - classLevel
 *               - dueDate
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               classLevel:
 *                 type: string
 *               classSection:
 *                 type: string
 *               assignedDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Homework created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires teacher or admin role
 *       500:
 *         description: Internal server error
 */
router.post(
  '/create',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  validateHomework,
  async (req, res) => {
    try {
      const {
        title,
        description,
        subject,
        classLevel,
        classSection,
        assignedDate,
        dueDate,
        attachments,
      } = req.body;

      // Look up teacher name from DB
      const teacher = (await User.findOne({ id: req.user.userId }).select('adSoyad').lean()) as {
        adSoyad?: string;
      } | null;

      const newHomework = new Homework({
        id: `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description,
        subject,
        teacherId: req.user.userId,
        teacherName: teacher?.adSoyad || 'Bilinmeyen Öğretmen',
        classLevel,
        classSection,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        dueDate: new Date(dueDate),
        attachments: attachments || [],
        status: 'active',
        isPublished: true,
      });

      const savedHomework = await newHomework.save();

      // Tarihleri ISO string formatına dönüştür
      const formattedHomework = {
        ...savedHomework.toObject(),
        assignedDate: savedHomework.assignedDate
          ? new Date(savedHomework.assignedDate).toISOString()
          : undefined,
        dueDate: savedHomework.dueDate ? new Date(savedHomework.dueDate).toISOString() : undefined,
        createdAt: savedHomework.createdAt
          ? new Date(savedHomework.createdAt).toISOString()
          : undefined,
        updatedAt: savedHomework.updatedAt
          ? new Date(savedHomework.updatedAt).toISOString()
          : undefined,
      };

      res.status(201).json(formattedHomework);
    } catch (error) {
      logger.error('Homework creation error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Ödev oluşturulurken hata oluştu' });
    }
  },
);

/**
 * @swagger
 * /api/homeworks/{id}:
 *   put:
 *     summary: Update a homework
 *     description: Only the teacher who created the homework or an admin can update it. Uses field whitelisting.
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Homework ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               classLevel:
 *                 type: string
 *               classSection:
 *                 type: string
 *               assignedDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Homework updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the homework owner or admin
 *       404:
 *         description: Homework not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['teacher', 'admin']),
  validateHomework,
  async (req, res) => {
    try {
      const homework = await Homework.findOne({ id: req.params.id });

      if (!homework) {
        return res.status(404).json({ error: 'Ödev bulunamadı' });
      }

      // Sadece oluşturan öğretmen veya admin güncelleyebilir
      if (homework.teacherId !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Bu ödevi güncelleme yetkiniz yok' });
      }

      // Field whitelisting — sadece izin verilen alanlar güncellenir
      const {
        title,
        description,
        subject,
        assignedDate,
        dueDate,
        attachments,
        classLevel,
        classSection,
      } = req.body;
      const updateFields: HomeworkUpdateFields = { updatedAt: new Date() };
      if (title !== undefined) updateFields.title = title;
      if (description !== undefined) updateFields.description = description;
      if (subject !== undefined) updateFields.subject = subject;
      if (assignedDate !== undefined) updateFields.assignedDate = new Date(assignedDate);
      if (dueDate !== undefined) updateFields.dueDate = new Date(dueDate);
      if (attachments !== undefined) updateFields.attachments = attachments;
      if (classLevel !== undefined) updateFields.classLevel = classLevel;
      if (classSection !== undefined) updateFields.classSection = classSection;

      const updatedHomework = await Homework.findOneAndUpdate({ id: req.params.id }, updateFields, {
        new: true,
      });

      if (!updatedHomework) {
        return res.status(404).json({ error: 'Ödev bulunamadı' });
      }

      // Tarihleri ISO string formatına dönüştür
      const formattedHomework = {
        ...updatedHomework.toObject(),
        assignedDate: updatedHomework.assignedDate
          ? new Date(updatedHomework.assignedDate).toISOString()
          : undefined,
        dueDate: updatedHomework.dueDate
          ? new Date(updatedHomework.dueDate).toISOString()
          : undefined,
        createdAt: updatedHomework.createdAt
          ? new Date(updatedHomework.createdAt).toISOString()
          : undefined,
        updatedAt: updatedHomework.updatedAt
          ? new Date(updatedHomework.updatedAt).toISOString()
          : undefined,
      };

      res.json(formattedHomework);
    } catch (error) {
      logger.error('Homework update error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Ödev güncellenirken hata oluştu' });
    }
  },
);

/**
 * @swagger
 * /api/homeworks/{id}:
 *   delete:
 *     summary: Delete a homework
 *     description: Only the teacher who created the homework or an admin can delete it.
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Homework ID (custom id or MongoDB _id)
 *     responses:
 *       204:
 *         description: Homework deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the homework owner or admin
 *       404:
 *         description: Homework not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateJWT, authorizeRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Hem id hem _id ile arama yap (MongoDB _id veya custom id field)
    let homework = await Homework.findOne({ id: id });
    if (!homework) {
      homework = await Homework.findById(id);
    }

    if (!homework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    // Sadece oluşturan öğretmen veya admin silebilir
    if (homework.teacherId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu ödevi silme yetkiniz yok' });
    }

    // Hem id hem _id ile silme dene
    let deleted = await Homework.findOneAndDelete({ id: id });
    if (!deleted) {
      deleted = await Homework.findByIdAndDelete(id);
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Ödev silinemedi' });
    }

    // Align with tests and REST best practices: 204 No Content on successful delete
    res.status(204).send();
  } catch (error) {
    logger.error('Homework deletion error', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Ödev silinirken hata oluştu' });
  }
});

/**
 * @swagger
 * /api/homeworks/{id}/status:
 *   patch:
 *     summary: Update homework status
 *     description: Admin-only endpoint to change the status of a homework.
 *     tags: [Homeworks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Homework ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, completed, expired]
 *     responses:
 *       200:
 *         description: Homework status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin role
 *       404:
 *         description: Homework not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/status', authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'completed', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }

    const updatedHomework = await Homework.findOneAndUpdate(
      { id: req.params.id },
      { status, updatedAt: new Date() },
      { new: true },
    );

    if (!updatedHomework) {
      return res.status(404).json({ error: 'Ödev bulunamadı' });
    }

    res.json(updatedHomework);
  } catch (error) {
    logger.error('Homework status update error', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Ödev durumu güncellenirken hata oluştu' });
  }
});

export default router;
