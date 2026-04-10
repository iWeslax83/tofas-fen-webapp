import { Router, Request, Response } from 'express';
import { PushSubscription } from '../models/PushSubscription';
import { authenticateJWT } from '../utils/jwt';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /vapid-public-key — VAPID public key döndür
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({ error: 'Push bildirimleri yapılandırılmamış' });
  }
  res.json({ publicKey });
});

// POST /subscribe — Push subscription kaydet
router.post(
  '/subscribe',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Geçersiz subscription verisi' });
      }

      await PushSubscription.findOneAndUpdate(
        { endpoint },
        { userId, endpoint, keys },
        { upsert: true, new: true },
      );

      res.json({ success: true });
    } catch (error) {
      logger.error('Error saving push subscription', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Push subscription kaydedilemedi' });
    }
  }),
);

// DELETE /unsubscribe — Push subscription sil
router.delete(
  '/unsubscribe',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'endpoint zorunludur' });
      }

      await PushSubscription.deleteOne({ endpoint });
      res.json({ success: true });
    } catch (error) {
      logger.error('Error removing push subscription', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Push subscription silinemedi' });
    }
  }),
);

export default router;
