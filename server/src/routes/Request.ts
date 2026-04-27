import { Router } from 'express';
import { Request as RequestModel } from '../models/Request';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { validateRequest as validateRequestData } from '../middleware/validation';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Kullanıcının tüm talepleri
router.get(
  '/user/:userId',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    try {
      const authUser = (req as any).user;
      // IDOR koruması: Sadece kendi taleplerini veya admin görebilir
      if (authUser?.userId !== req.params.userId && authUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Bu talepleri görme yetkiniz yok' });
      }
      const reqs = await RequestModel.find({ userId: req.params.userId }).sort({ createdAt: -1 });
      res.json(reqs);
    } catch (error) {
      logger.error('Talep getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Tüm talepler (admin) - pagination destekli
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    try {
      const { page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100);
      const skip = (pageNum - 1) * limitNum;

      const [reqs, total] = await Promise.all([
        RequestModel.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        RequestModel.countDocuments(),
      ]);

      res.json({
        data: reqs,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      logger.error('Talep listeleme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Yeni talep oluştur
router.post(
  '/',
  authenticateJWT,
  validateRequestData,
  asyncHandler(async (req, res) => {
    try {
      const { userId, type, details } = req.body;
      const reqDoc = await RequestModel.create({ userId, type, details });
      res.status(201).json(reqDoc);
    } catch (error) {
      logger.error('Talep olusturma hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Talep durumunu güncelle (admin onay/red)
router.patch(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    try {
      const updated = await RequestModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Talep bulunamadı' });
      }
      res.json(updated);
    } catch (error) {
      logger.error('Talep guncelleme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Talebi sil (sadece oluşturan kişi veya admin)
router.delete(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    try {
      const requestDoc = await RequestModel.findById(req.params.id);
      if (!requestDoc) {
        return res.status(404).json({ error: 'Talep bulunamadı' });
      }
      // Sahiplik kontrolü: Sadece talebi oluşturan veya admin silebilir
      const authUser = (req as any).user;
      if ((requestDoc as any).userId !== authUser?.userId && authUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Bu talebi silme yetkiniz yok' });
      }
      await RequestModel.findByIdAndDelete(req.params.id);
      res.status(204).end();
    } catch (error) {
      logger.error('Talep silme hatasi', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

export default router;
