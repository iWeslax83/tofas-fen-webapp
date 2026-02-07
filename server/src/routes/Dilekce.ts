import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../utils/jwt';
import { requireRole } from '../middleware/auth';
import { Dilekce } from '../models/Dilekce';
import { AuditLogService } from '../services/auditLogService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/dilekce');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'dilekce-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece PDF, DOC, DOCX, JPG, JPEG, PNG dosyaları yüklenebilir.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Create dilekçe
 * Students, teachers, and parents can create
 */
router.post(
  '/',
  authenticateJWT,
  upload.array('attachments', 5), // Max 5 files
  asyncHandler(async (req: Request, res: Response) => {
    const { type, subject, content, priority, category } = req.body;

    if (!type || !subject || !content) {
      res.status(400).json({
        error: 'Tür, konu ve içerik gereklidir'
      });
      return;
    }

    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Kullanıcı bilgisi bulunamadı' });
      return;
    }

    // Get file paths
    const attachments = (req.files as Express.Multer.File[])?.map(file =>
      `/uploads/dilekce/${file.filename}`
    ) || [];

    const dilekce = new Dilekce({
      userId: user.id,
      userName: user.adSoyad,
      userRole: user.rol,
      type,
      subject,
      content,
      attachments,
      priority: priority || 'medium',
      category,
      status: 'pending'
    });

    await dilekce.save();

    // Log the creation
    await AuditLogService.log(req, 'create', 'dilekce', {
      resourceId: dilekce._id.toString(),
      details: { type, subject, priority }
    });

    res.status(201).json({
      success: true,
      message: 'Dilekçe oluşturuldu',
      dilekce
    });
  })
);

/**
 * Get dilekçe requests
 */
router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      userId,
      type,
      status,
      priority,
      page = '1',
      limit = '50'
    } = req.query;

    const user = (req as any).user;
    const query: any = {};

    // Role-based filtering
    if (user.rol === 'student' || user.rol === 'teacher' || user.rol === 'parent') {
      // Users can only see their own dilekçe
      query.userId = user.id;
    } else if (userId) {
      // Admins can filter by user
      query.userId = userId;
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [dilekceler, total] = await Promise.all([
      Dilekce.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Dilekce.countDocuments(query)
    ]);

    res.json({
      success: true,
      dilekceler,
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
 * Get single dilekçe
 */
router.get(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    const dilekce = await Dilekce.findById(id);
    if (!dilekce) {
      res.status(404).json({ error: 'Dilekçe bulunamadı' });
      return;
    }

    // Check permissions
    if (user.rol !== 'admin' && dilekce.userId !== user.id) {
      res.status(403).json({ error: 'Bu dilekçeye erişim yetkiniz yok' });
      return;
    }

    res.json({
      success: true,
      dilekce
    });
  })
);

/**
 * Update dilekçe status (admin only)
 */
router.put(
  '/:id/status',
  authenticateJWT,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reviewNote, response } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Durum gereklidir' });
      return;
    }

    const admin = (req as any).user;
    const dilekce = await Dilekce.findById(id);

    if (!dilekce) {
      res.status(404).json({ error: 'Dilekçe bulunamadı' });
      return;
    }

    dilekce.status = status;
    if (reviewNote) dilekce.reviewNote = reviewNote;
    if (response) dilekce.response = response;
    dilekce.reviewedBy = admin.id;
    dilekce.reviewedByName = admin.adSoyad;
    dilekce.reviewedAt = new Date();

    if (status === 'completed') {
      dilekce.completedAt = new Date();
    }

    await dilekce.save();

    // Log the update
    await AuditLogService.log(req, 'update', 'dilekce', {
      resourceId: id,
      details: { status, reviewNote }
    });

    res.json({
      success: true,
      message: 'Dilekçe durumu güncellendi',
      dilekce
    });
  })
);

/**
 * Update dilekçe (only by creator, if pending)
 */
router.put(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subject, content, priority, category } = req.body;

    const user = (req as any).user;
    const dilekce = await Dilekce.findById(id);

    if (!dilekce) {
      res.status(404).json({ error: 'Dilekçe bulunamadı' });
      return;
    }

    if (dilekce.userId !== user.id) {
      res.status(403).json({ error: 'Bu dilekçeyi düzenleme yetkiniz yok' });
      return;
    }

    if (dilekce.status !== 'pending') {
      res.status(400).json({ error: 'Sadece bekleyen dilekçeler düzenlenebilir' });
      return;
    }

    if (subject) dilekce.subject = subject;
    if (content) dilekce.content = content;
    if (priority) dilekce.priority = priority;
    if (category !== undefined) dilekce.category = category;

    await dilekce.save();

    // Log the update
    await AuditLogService.log(req, 'update', 'dilekce', {
      resourceId: id,
      details: { subject, content }
    });

    res.json({
      success: true,
      message: 'Dilekçe güncellendi',
      dilekce
    });
  })
);

/**
 * Delete dilekçe (only by creator, if pending)
 */
router.delete(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = (req as any).user;
    const dilekce = await Dilekce.findById(id);

    if (!dilekce) {
      res.status(404).json({ error: 'Dilekçe bulunamadı' });
      return;
    }

    if (dilekce.userId !== user.id && user.rol !== 'admin') {
      res.status(403).json({ error: 'Bu dilekçeyi silme yetkiniz yok' });
      return;
    }

    if (dilekce.status !== 'pending' && user.rol !== 'admin') {
      res.status(400).json({ error: 'Sadece bekleyen dilekçeler silinebilir' });
      return;
    }

    // Delete attached files
    if (dilekce.attachments && dilekce.attachments.length > 0) {
      dilekce.attachments.forEach(filePath => {
        const fullPath = path.join(__dirname, '../../', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await Dilekce.findByIdAndDelete(id);

    // Log the deletion
    await AuditLogService.log(req, 'delete', 'dilekce', {
      resourceId: id,
      details: { userId: dilekce.userId }
    });

    res.json({
      success: true,
      message: 'Dilekçe silindi'
    });
  })
);

export default router;

