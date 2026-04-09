import { Router, Request, Response } from 'express';
import { Registration } from '../models/Registration';
import { User } from '../models/User';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { NotificationService } from '../services/NotificationService';
import { sendMail } from '../mailService';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import { logSecurityEvent, SecurityEvent } from '../utils/securityLogger';

const router = Router();

// Rate limiter for public registration endpoint
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 applications per 15 minutes per IP
  message: { error: 'Çok fazla başvuru yapıldı. Lütfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public: Submit a new registration application
router.post('/', registrationLimiter, async (req: Request, res: Response) => {
  try {
    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      studentName,
      studentBirthDate,
      currentSchool,
      targetClass,
      parentName,
      parentPhone,
      parentEmail,
      notes,
    } = req.body;

    if (
      !applicantName ||
      !applicantEmail ||
      !applicantPhone ||
      !studentName ||
      !targetClass ||
      !parentName ||
      !parentPhone
    ) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // Validate types
    if (typeof applicantEmail !== 'string' || typeof applicantName !== 'string') {
      return res.status(400).json({ error: 'Gecersiz veri tipleri' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)) {
      return res.status(400).json({ error: 'Gecersiz e-posta adresi' });
    }

    const registration = new Registration({
      applicantName,
      applicantEmail,
      applicantPhone,
      studentName,
      studentBirthDate,
      currentSchool,
      targetClass,
      parentName,
      parentPhone,
      parentEmail,
      notes,
    });

    await registration.save();

    // Notify admins
    const admins = await User.find({ rol: 'admin', isActive: true });
    const adminIds = admins.map((a) => a.id);

    if (adminIds.length > 0) {
      await NotificationService.createBulkNotifications({
        userIds: adminIds,
        title: 'Yeni Kayıt Başvurusu',
        message: `${studentName} için yeni kayıt başvurusu yapıldı.`,
        type: 'request',
        priority: 'high',
        category: 'administrative',
        actionUrl: '/admin/yeni-kayit-basvurulari',
        actionText: 'Başvuruyu İncele',
        sendEmail: true,
        emailSubject: 'Yeni Kayıt Başvurusu - Tofaş Fen Lisesi',
      });
    }

    logSecurityEvent({
      event: SecurityEvent.REGISTRATION_SUBMITTED,
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      details: {
        registrationId: String(registration._id),
        applicantEmail,
        targetClass,
      },
    });

    res.status(201).json({ success: true, message: 'Başvurunuz başarıyla alındı.' });
  } catch (error) {
    logger.error('Registration create error', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Başvuru oluşturulurken hata oluştu' });
  }
});

// Admin: Get all registrations
router.get('/', authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const pageNum = Math.max(parseInt(page as string) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);

    const [registrations, total] = await Promise.all([
      Registration.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Registration.countDocuments(filter),
    ]);

    res.json({ data: registrations, total, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Registration list error', {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ error: 'Başvurular listelenirken hata oluştu' });
  }
});

// Admin: Get registration stats (must be before /:id)
router.get(
  '/stats/summary',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (_req: Request, res: Response) => {
    try {
      const [pending, approved, rejected, interview, total] = await Promise.all([
        Registration.countDocuments({ status: 'pending' }),
        Registration.countDocuments({ status: 'approved' }),
        Registration.countDocuments({ status: 'rejected' }),
        Registration.countDocuments({ status: 'interview' }),
        Registration.countDocuments({}),
      ]);

      res.json({ pending, approved, rejected, interview, total });
    } catch (error) {
      res.status(500).json({ error: 'İstatistikler alınırken hata oluştu' });
    }
  },
);

// Admin: Get single registration
router.get(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req: Request, res: Response) => {
    try {
      const registration = await Registration.findById(req.params.id);
      if (!registration) return res.status(404).json({ error: 'Başvuru bulunamadı' });
      res.json(registration);
    } catch (error) {
      res.status(500).json({ error: 'Başvuru alınırken hata oluştu' });
    }
  },
);

// Admin: Update registration status and create account if approved
router.put(
  '/:id/status',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { status, rejectionReason } = req.body;
      const authUser = (req as any).user;

      if (!['pending', 'approved', 'rejected', 'interview'].includes(status)) {
        return res.status(400).json({ error: 'Gecersiz durum' });
      }

      const registration = await Registration.findById(req.params.id);
      if (!registration) return res.status(404).json({ error: 'Başvuru bulunamadı' });

      registration.status = status;
      registration.reviewedBy = authUser.userId;
      registration.reviewedAt = new Date();
      if (rejectionReason) registration.rejectionReason = rejectionReason;

      // If approved, create a ziyaretci user account
      if (status === 'approved' && !registration.createdUserId) {
        const userId = `ZYR-${Date.now()}`;
        const tempPassword = crypto.randomBytes(6).toString('base64url') + 'A1!';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = new User({
          id: userId,
          adSoyad: registration.applicantName,
          sifre: hashedPassword,
          rol: 'ziyaretci',
          email: registration.applicantEmail,
          isActive: true,
        });

        await newUser.save();
        registration.createdUserId = userId;

        // Send credentials via email
        const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #1e293b; text-align: center;">Tofas Fen Lisesi - Hesap Bilgileri</h2>
          <div style="background: #ffffff; border-radius: 8px; padding: 24px;">
            <p>Sayin ${registration.applicantName},</p>
            <p>Kayıt başvurunuz onaylandı. Sisteme giris bilgileriniz:</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p><strong>Kullanici ID:</strong> ${userId}</p>
              <p><strong>Sifre:</strong> ${tempPassword}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">Sisteme giris yaparak soru sorabilir ve randevu alabilirsiniz.</p>
          </div>
        </div>
      `;

        try {
          await sendMail(
            registration.applicantEmail,
            'Hesap Bilgileri - Tofas Fen Lisesi',
            emailHtml,
          );
        } catch (emailErr) {
          logger.error('Failed to send credentials email', {
            error: emailErr instanceof Error ? emailErr.message : emailErr,
          });
        }
      }

      await registration.save();

      // B-M1: admin approval/rejection decisions must be audit-logged.
      const eventMap: Record<string, SecurityEvent | undefined> = {
        approved: SecurityEvent.REGISTRATION_APPROVED,
        rejected: SecurityEvent.REGISTRATION_REJECTED,
        interview: SecurityEvent.REGISTRATION_INTERVIEW,
      };
      const auditEvent = eventMap[status];
      if (auditEvent) {
        logSecurityEvent({
          event: auditEvent,
          userId: authUser.userId,
          ip: req.ip,
          userAgent: req.get('user-agent') || undefined,
          details: {
            registrationId: String(registration._id),
            applicantEmail: registration.applicantEmail,
            createdUserId: registration.createdUserId,
            rejectionReason: rejectionReason || undefined,
          },
        });
      }

      res.json({ success: true, registration });
    } catch (error) {
      logger.error('Registration status update error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Başvuru güncellenirken hata oluştu' });
    }
  },
);

export default router;
