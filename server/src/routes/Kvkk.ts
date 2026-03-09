import { Router, Request, Response } from 'express';
import { KvkkConsent, DataDeletionRequest } from '../models/KvkkConsent';
import { User } from '../models/User';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { requireOwnership } from '../middleware/ownershipCheck';
import { AuditLogService } from '../services/auditLogService';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * GET /api/kvkk/consents — Get user's consent status
 */
router.get('/consents', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const consents = await KvkkConsent.find({ userId }).lean();

    // Return all consent types with their status
    const consentTypes = ['data_processing', 'data_sharing', 'marketing', 'cookies', 'profiling'];
    const consentMap = consentTypes.map(type => {
      const existing = consents.find(c => c.consentType === type);
      return {
        consentType: type,
        granted: existing?.granted ?? false,
        grantedAt: existing?.grantedAt,
        revokedAt: existing?.revokedAt,
        version: existing?.version ?? '1.0',
      };
    });

    res.json({ success: true, consents: consentMap });
  } catch (error) {
    logger.error('Error fetching KVKK consents', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Onam bilgileri alınamadı' });
  }
});

/**
 * POST /api/kvkk/consents — Grant or revoke consent
 */
router.post('/consents', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { consentType, granted } = req.body;

    const validTypes = ['data_processing', 'data_sharing', 'marketing', 'cookies', 'profiling'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ error: 'Geçersiz onam türü' });
    }
    if (typeof granted !== 'boolean') {
      return res.status(400).json({ error: 'granted alanı boolean olmalıdır' });
    }

    // data_processing consent is mandatory for using the system
    if (consentType === 'data_processing' && !granted) {
      return res.status(400).json({
        error: 'Kişisel veri işleme onayı sistem kullanımı için zorunludur',
      });
    }

    const descriptions: Record<string, string> = {
      data_processing: 'Kişisel verilerin işlenmesi (KVKK Madde 5)',
      data_sharing: 'Kişisel verilerin üçüncü taraflarla paylaşılması (KVKK Madde 8)',
      marketing: 'Pazarlama amaçlı iletişim',
      cookies: 'Çerez kullanımı',
      profiling: 'Profilleme ve otomatik karar verme',
    };

    const updateData: any = {
      granted,
      version: '1.0',
      description: descriptions[consentType],
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    if (granted) {
      updateData.grantedAt = new Date();
      updateData.revokedAt = null;
    } else {
      updateData.revokedAt = new Date();
    }

    await KvkkConsent.findOneAndUpdate(
      { userId, consentType },
      { $set: updateData },
      { upsert: true, new: true }
    );

    AuditLogService.log(req, granted ? 'create' : 'delete', 'kvkk_consent' as any, {
      details: { consentType, granted },
    });

    res.json({ success: true, message: granted ? 'Onam verildi' : 'Onam geri çekildi' });
  } catch (error) {
    logger.error('Error updating KVKK consent', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Onam güncellenemedi' });
  }
});

/**
 * GET /api/kvkk/my-data — Export user's personal data (KVKK right of access)
 */
router.get('/my-data', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const user = await User.findOne({ id: userId }).lean();
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Strip sensitive fields
    const { sifre, twoFactorCode, twoFactorExpiry, emailVerificationCode, ...safeUser } = user as any;

    // Mask TCKN
    if (safeUser.tckn) {
      const { maskTckn } = await import('../utils/encryption');
      safeUser.tcknMasked = maskTckn(safeUser.tckn);
      delete safeUser.tckn; // Don't expose raw encrypted TCKN
    }

    const consents = await KvkkConsent.find({ userId }).lean();

    AuditLogService.log(req, 'read' as any, 'kvkk_data_export' as any, {
      details: { userId },
    });

    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      userData: safeUser,
      consents,
      dataCategories: {
        identity: 'Ad Soyad, T.C. Kimlik No (maskelenmiş)',
        contact: 'E-posta adresi',
        education: 'Sınıf, Şube, Oda bilgileri',
        authentication: 'Giriş geçmişi, cihaz bilgileri',
        usage: 'Bildirim tercihleri, sistem kullanım verileri',
      },
    });
  } catch (error) {
    logger.error('Error exporting user data', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Kişisel veriler dışa aktarılamadı' });
  }
});

/**
 * POST /api/kvkk/deletion-request — Request data deletion (right to be forgotten)
 */
router.post('/deletion-request', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { reason } = req.body;

    // Check for existing pending request
    const existing = await DataDeletionRequest.findOne({ userId, status: { $in: ['pending', 'processing'] } });
    if (existing) {
      return res.status(409).json({ error: 'Zaten bekleyen bir silme talebiniz bulunmaktadır' });
    }

    const request = new DataDeletionRequest({
      userId,
      reason: reason || 'Kullanıcı talebi',
      requestedAt: new Date(),
    });
    await request.save();

    AuditLogService.log(req, 'create', 'kvkk_deletion_request' as any, {
      resourceId: String(request._id),
      details: { userId, reason },
    });

    res.status(201).json({
      success: true,
      message: 'Veri silme talebiniz alındı. 30 gün içinde işleme alınacaktır.',
      requestId: request._id,
      status: request.status,
    });
  } catch (error) {
    logger.error('Error creating deletion request', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Silme talebi oluşturulamadı' });
  }
});

/**
 * GET /api/kvkk/deletion-request — Check deletion request status
 */
router.get('/deletion-request', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const requests = await DataDeletionRequest.find({ userId }).sort({ requestedAt: -1 }).lean();

    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Error fetching deletion requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Silme talepleri alınamadı' });
  }
});

/**
 * Admin: List all deletion requests
 */
router.get('/admin/deletion-requests', authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const filter: any = {};
    if (status) filter.status = status;

    const requests = await DataDeletionRequest.find(filter).sort({ requestedAt: -1 }).lean();

    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Error fetching admin deletion requests', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Silme talepleri alınamadı' });
  }
});

/**
 * Admin: Process a deletion request
 */
router.patch('/admin/deletion-requests/:id', authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { action, rejectionReason, retainedData, retainReason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "action 'approve' veya 'reject' olmalıdır" });
    }

    const request = await DataDeletionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Silme talebi bulunamadı' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Bu talep zaten işleme alınmış' });
    }

    if (action === 'reject') {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason || 'Yasal saklama yükümlülüğü';
      request.processedAt = new Date();
      request.processedBy = req.user?.userId;
      await request.save();

      return res.json({ success: true, message: 'Silme talebi reddedildi', request });
    }

    // Process deletion
    request.status = 'processing';
    await request.save();

    const deletedCollections: string[] = [];

    // Anonymize user data instead of hard delete (legal retention)
    const user = await User.findOne({ id: request.userId });
    if (user) {
      user.adSoyad = 'Silinmiş Kullanıcı';
      user.email = undefined;
      user.tckn = undefined;
      user.trustedDevices = [];
      user.isActive = false;
      await user.save();
      deletedCollections.push('users (anonymized)');
    }

    // Delete consents
    await KvkkConsent.deleteMany({ userId: request.userId });
    deletedCollections.push('kvkk_consents');

    request.status = 'completed';
    request.processedAt = new Date();
    request.processedBy = req.user?.userId;
    request.deletedData = deletedCollections;
    request.retainedData = retainedData || ['audit_logs (yasal zorunluluk)'];
    request.retainReason = retainReason || 'KVKK Madde 28 - Yasal saklama yükümlülüğü';
    await request.save();

    AuditLogService.log(req, 'delete', 'kvkk_deletion' as any, {
      resourceId: String(request._id),
      details: { userId: request.userId, deletedCollections },
    });

    res.json({
      success: true,
      message: 'Veri silme işlemi tamamlandı',
      request,
    });
  } catch (error) {
    logger.error('Error processing deletion request', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Silme talebi işlenemedi' });
  }
});

/**
 * GET /api/kvkk/privacy-policy — Return current privacy policy version info
 */
router.get('/privacy-policy', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    version: '1.0',
    lastUpdated: '2026-03-01',
    title: 'Kişisel Verilerin Korunması Politikası',
    dataController: 'Tofaş Fen Lisesi',
    contact: 'kvkk@tofas-fen.com',
    rights: [
      'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
      'Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme',
      'Kişisel verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme',
      'Kişisel verilerin aktarıldığı üçüncü kişileri bilme',
      'Kişisel verilerin eksik veya yanlış işlenmişse düzeltilmesini isteme',
      'Kişisel verilerin silinmesini veya yok edilmesini isteme',
      'İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme',
    ],
  });
});

export default router;
