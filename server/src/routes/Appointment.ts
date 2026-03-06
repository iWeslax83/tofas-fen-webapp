import { Router, Request, Response } from 'express';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { NotificationService } from '../services/NotificationService';
import { sendMail } from '../mailService';
import logger from '../utils/logger';

const router = Router();

// Ziyaretci: Create appointment
router.post('/', authenticateJWT, authorizeRoles(['ziyaretci']), async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { date, timeSlot, purpose, notes, registrationId } = req.body;

    if (!date || !timeSlot || !purpose) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // Validate date is valid and in the future
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: 'Gecersiz tarih formati' });
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (appointmentDate < now) {
      return res.status(400).json({ error: 'Gecmis bir tarihe randevu olusturulamaz' });
    }

    const user = await User.findOne({ id: authUser.userId });
    if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    // Check for conflicting appointment on same date+time
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      date: { $gte: dayStart, $lte: dayEnd },
      timeSlot,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ error: 'Bu tarih ve saat dilimi dolu. Lutfen baska bir zaman secin.' });
    }

    const appointment = new Appointment({
      applicantUserId: authUser.userId,
      applicantName: user.adSoyad,
      applicantEmail: user.email || '',
      applicantPhone: '',
      date: new Date(date),
      timeSlot,
      purpose,
      notes,
      registrationId
    });

    await appointment.save();

    // Notify admins
    const admins = await User.find({ rol: 'admin', isActive: true });
    const adminIds = admins.map(a => a.id);

    if (adminIds.length > 0) {
      const dateStr = new Date(date).toLocaleDateString('tr-TR');
      await NotificationService.createBulkNotifications({
        userIds: adminIds,
        title: 'Yeni Randevu Talebi',
        message: `${user.adSoyad} ${dateStr} ${timeSlot} icin randevu talep etti.`,
        type: 'request',
        priority: 'high',
        category: 'administrative',
        actionUrl: '/admin/randevu-basvurulari',
        actionText: 'Randevuyu Incele',
        sendEmail: true,
        emailSubject: 'Yeni Randevu Talebi - Tofas Fen Lisesi'
      });
    }

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    logger.error('Appointment create error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Randevu olusturulurken hata olustu' });
  }
});

// Authenticated user: Get own appointments
router.get('/my', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const appointments = await Appointment.find({ applicantUserId: authUser.userId }).sort({ date: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Randevular alinirken hata olustu' });
  }
});

// Visitor: Cancel own pending appointment
router.put('/my/:id/cancel', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Randevu bulunamadi' });
    if (appointment.applicantUserId !== authUser.userId) {
      return res.status(403).json({ error: 'Bu randevuyu iptal etme yetkiniz yok' });
    }
    if (appointment.status !== 'pending') {
      return res.status(400).json({ error: 'Sadece beklemedeki randevular iptal edilebilir' });
    }
    appointment.status = 'cancelled';
    await appointment.save();
    res.json({ success: true });
  } catch (error) {
    logger.error('Appointment cancel error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Randevu iptal edilirken hata olustu' });
  }
});

// Admin: Get all appointments
router.get('/', authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const pageNum = Math.max(parseInt(page as string) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter).sort({ date: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Appointment.countDocuments(filter)
    ]);

    res.json({ data: appointments, total, page: pageNum, limit: limitNum });
  } catch (error) {
    res.status(500).json({ error: 'Randevular listelenirken hata olustu' });
  }
});

// Admin: Update appointment status
router.put('/:id/status', authenticateJWT, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    const authUser = (req as any).user;

    if (!['pending', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Gecersiz durum' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Randevu bulunamadi' });

    appointment.status = status;
    appointment.reviewedBy = authUser.userId;
    appointment.reviewedAt = new Date();
    if (rejectionReason) appointment.rejectionReason = rejectionReason;

    await appointment.save();

    // Notify applicant
    const statusMessages: Record<string, string> = {
      approved: 'Randevunuz onaylandi',
      rejected: 'Randevunuz reddedildi',
      completed: 'Randevunuz tamamlandi',
      cancelled: 'Randevunuz iptal edildi'
    };

    if (statusMessages[status]) {
      const dateStr = appointment.date.toLocaleDateString('tr-TR');
      await NotificationService.createNotification({
        userId: appointment.applicantUserId,
        title: 'Randevu Durumu Guncellendi',
        message: `${dateStr} ${appointment.timeSlot} tarihli randevunuz: ${statusMessages[status]}`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
        priority: 'high',
        category: 'administrative',
        sendEmail: true
      });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    logger.error('Appointment status update error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Randevu guncellenirken hata olustu' });
  }
});

// Admin: Get appointment stats
router.get('/stats/summary', authenticateJWT, authorizeRoles(['admin']), async (_req: Request, res: Response) => {
  try {
    const [pending, approved, rejected, completed, total] = await Promise.all([
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'approved' }),
      Appointment.countDocuments({ status: 'rejected' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({})
    ]);

    res.json({ pending, approved, rejected, completed, total });
  } catch (error) {
    res.status(500).json({ error: 'Istatistikler alinirken hata olustu' });
  }
});

// Get available time slots for a date
router.get('/available-slots', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Tarih gerekli' });

    const dayStart = new Date(date as string);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date as string);
    dayEnd.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'approved'] }
    }).select('timeSlot');

    const bookedSlots = bookedAppointments.map(a => a.timeSlot);

    const allSlots = [
      '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00',
      '11:00-11:30', '11:30-12:00', '13:00-13:30', '13:30-14:00',
      '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00'
    ];

    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
    res.json({ availableSlots, bookedSlots });
  } catch (error) {
    res.status(500).json({ error: 'Musait saatler alinirken hata olustu' });
  }
});

export default router;
