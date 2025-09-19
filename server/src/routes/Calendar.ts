import { Router } from 'express';
import { CalendarService, CalendarFilters, EventCreateData } from '../services/CalendarService';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';

const router = Router();

// Validation rules for calendar creation
const validateCalendarCreate = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Takvim adı 1-100 karakter arasında olmalıdır'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Açıklama 500 karakterden uzun olamaz'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Geçersiz renk formatı'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('Geçersiz varsayılan değeri'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('Geçersiz genel erişim değeri'),
  
  body('allowedRoles')
    .optional()
    .isArray()
    .withMessage('İzin verilen roller dizi olmalıdır'),
  
  validateRequest
];

// Validation rules for event creation
const validateEventCreate = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Etkinlik başlığı 1-200 karakter arasında olmalıdır'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Açıklama 1000 karakterden uzun olamaz'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Geçersiz başlangıç tarihi'),
  
  body('endDate')
    .isISO8601()
    .withMessage('Geçersiz bitiş tarihi')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      }
      return true;
    }),
  
  body('allDay')
    .isBoolean()
    .withMessage('Geçersiz tüm gün değeri'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Konum 200 karakterden uzun olamaz'),
  
  body('type')
    .isIn(['class', 'exam', 'activity', 'meeting', 'holiday', 'personal', 'reminder'])
    .withMessage('Geçersiz etkinlik türü'),
  
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Geçersiz öncelik değeri'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Geçersiz renk formatı'),
  
  body('isRecurring')
    .isBoolean()
    .withMessage('Geçersiz tekrarlama değeri'),
  
  body('recurringPattern.frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Geçersiz tekrarlama sıklığı'),
  
  body('recurringPattern.interval')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Tekrarlama aralığı en az 1 olmalıdır'),
  
  body('reminders')
    .isArray()
    .withMessage('Hatırlatmalar dizi olmalıdır'),
  
  body('reminders.*.type')
    .isIn(['email', 'push', 'sms'])
    .withMessage('Geçersiz hatırlatma türü'),
  
  body('reminders.*.minutesBefore')
    .isInt({ min: 0 })
    .withMessage('Hatırlatma süresi 0 veya daha büyük olmalıdır'),
  
  body('attendees')
    .isArray()
    .withMessage('Katılımcılar dizi olmalıdır'),
  
  body('attendees.*.userId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Kullanıcı ID gerekli'),
  
  body('attendees.*.role')
    .isIn(['organizer', 'attendee', 'optional'])
    .withMessage('Geçersiz katılımcı rolü'),
  
  body('calendarId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Takvim ID gerekli'),
  
  validateRequest
];

// ===== CALENDAR ROUTES =====

// Get user's calendars
router.get('/calendars', authenticateJWT, async (req, res) => {
  try {
    const calendars = await CalendarService.getUserCalendars(req.user.userId, req.user.role);
    res.json(calendars);
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({ error: 'Takvimler getirilirken hata oluştu' });
  }
});

// Get specific calendar
router.get('/calendars/:id', authenticateJWT, async (req, res) => {
  try {
    const calendar = await CalendarService.getCalendarById(req.params.id, req.user.userId, req.user.role);
    
    if (!calendar) {
      return res.status(404).json({ error: 'Takvim bulunamadı' });
    }

    res.json(calendar);
  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({ error: 'Takvim getirilirken hata oluştu' });
  }
});

// Create new calendar
router.post('/calendars', authenticateJWT, validateCalendarCreate, async (req, res) => {
  try {
    const calendar = await CalendarService.createCalendar(req.user.userId, req.body);
    res.status(201).json(calendar);
  } catch (error) {
    console.error('Calendar creation error:', error);
    res.status(500).json({ error: 'Takvim oluşturulurken hata oluştu' });
  }
});

// Update calendar
router.put('/calendars/:id', authenticateJWT, validateCalendarCreate, async (req, res) => {
  try {
    const calendar = await CalendarService.updateCalendar(req.params.id, req.user.userId, req.body);
    
    if (!calendar) {
      return res.status(404).json({ error: 'Takvim bulunamadı veya güncelleme izniniz yok' });
    }

    res.json(calendar);
  } catch (error) {
    console.error('Calendar update error:', error);
    res.status(500).json({ error: 'Takvim güncellenirken hata oluştu' });
  }
});

// Delete calendar
router.delete('/calendars/:id', authenticateJWT, async (req, res) => {
  try {
    const success = await CalendarService.deleteCalendar(req.params.id, req.user.userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Takvim bulunamadı veya silme izniniz yok' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Calendar deletion error:', error);
    res.status(500).json({ error: 'Takvim silinirken hata oluştu' });
  }
});

// Share calendar
router.post('/calendars/:id/share', authenticateJWT, [
  body('userId').trim().isLength({ min: 1 }).withMessage('Kullanıcı ID gerekli'),
  body('permission').isIn(['read', 'write', 'admin']).withMessage('Geçersiz izin türü'),
  validateRequest
], async (req, res) => {
  try {
    const success = await CalendarService.shareCalendar(
      req.params.id,
      req.user.userId,
      req.body
    );
    
    if (!success) {
      return res.status(404).json({ error: 'Takvim bulunamadı veya paylaşım izniniz yok' });
    }

    res.json({ message: 'Takvim başarıyla paylaşıldı' });
  } catch (error) {
    console.error('Calendar share error:', error);
    res.status(500).json({ error: 'Takvim paylaşılırken hata oluştu' });
  }
});

// ===== EVENT ROUTES =====

// Get events with filters
router.get('/events', authenticateJWT, [
  query('startDate').optional().isISO8601().withMessage('Geçersiz başlangıç tarihi'),
  query('endDate').optional().isISO8601().withMessage('Geçersiz bitiş tarihi'),
  query('type').optional().isIn(['class', 'exam', 'activity', 'meeting', 'holiday', 'personal', 'reminder']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('status').optional().isIn(['scheduled', 'in-progress', 'completed', 'cancelled']),
  query('calendarId').optional().trim(),
  query('search').optional().trim(),
  validateRequest
], async (req, res) => {
  try {
    const filters: CalendarFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      type: req.query.type as string,
      priority: req.query.priority as string,
      status: req.query.status as string,
      calendarId: req.query.calendarId as string,
      search: req.query.search as string
    };

    const events = await CalendarService.getEvents(req.user.userId, req.user.role, filters);
    res.json(events);
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ error: 'Etkinlikler getirilirken hata oluştu' });
  }
});

// Get specific event
router.get('/events/:id', authenticateJWT, async (req, res) => {
  try {
    const event = await CalendarService.getEventById(req.params.id, req.user.userId, req.user.role);
    
    if (!event) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı' });
    }

    res.json(event);
  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ error: 'Etkinlik getirilirken hata oluştu' });
  }
});

// Create new event
router.post('/events', authenticateJWT, validateEventCreate, async (req, res) => {
  try {
    const event = await CalendarService.createEvent(req.user.userId, req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Event creation error:', error);
    if (error.message.includes('Calendar access denied')) {
      res.status(403).json({ error: 'Takvim erişim izniniz yok' });
    } else if (error.message.includes('Event overlaps')) {
      res.status(400).json({ error: 'Etkinlik mevcut etkinliklerle çakışıyor' });
    } else {
      res.status(500).json({ error: 'Etkinlik oluşturulurken hata oluştu' });
    }
  }
});

// Update event
router.put('/events/:id', authenticateJWT, validateEventCreate, async (req, res) => {
  try {
    const event = await CalendarService.updateEvent(req.params.id, req.user.userId, req.body);
    
    if (!event) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı veya güncelleme izniniz yok' });
    }

    res.json(event);
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({ error: 'Etkinlik güncellenirken hata oluştu' });
  }
});

// Delete event
router.delete('/events/:id', authenticateJWT, async (req, res) => {
  try {
    const success = await CalendarService.deleteEvent(req.params.id, req.user.userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı veya silme izniniz yok' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Event deletion error:', error);
    res.status(500).json({ error: 'Etkinlik silinirken hata oluştu' });
  }
});

// Respond to event invitation
router.post('/events/:id/respond', authenticateJWT, [
  body('response').isIn(['accepted', 'declined', 'tentative']).withMessage('Geçersiz yanıt'),
  validateRequest
], async (req, res) => {
  try {
    const success = await CalendarService.respondToEvent(
      req.params.id,
      req.user.userId,
      req.body.response
    );
    
    if (!success) {
      return res.status(404).json({ error: 'Etkinlik bulunamadı veya katılımcı değilsiniz' });
    }

    res.json({ message: 'Yanıtınız kaydedildi' });
  } catch (error) {
    console.error('Event response error:', error);
    res.status(500).json({ error: 'Yanıt kaydedilirken hata oluştu' });
  }
});

// ===== ANALYTICS ROUTES =====

// Get calendar statistics
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const stats = await CalendarService.getCalendarStats(req.user.userId, req.user.role);
    res.json(stats);
  } catch (error) {
    console.error('Calendar stats error:', error);
    res.status(500).json({ error: 'İstatistikler getirilirken hata oluştu' });
  }
});

// ===== REMINDER ROUTES =====

// Process reminders (admin only)
router.post('/reminders/process', authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    await CalendarService.processReminders();
    res.json({ message: 'Hatırlatmalar işlendi' });
  } catch (error) {
    console.error('Reminder processing error:', error);
    res.status(500).json({ error: 'Hatırlatmalar işlenirken hata oluştu' });
  }
});

// ===== EXPORT/IMPORT ROUTES =====

// Export calendar events
router.get('/export/:calendarId', authenticateJWT, [
  query('format').isIn(['json', 'ics', 'csv']).withMessage('Geçersiz format'),
  query('startDate').optional().isISO8601().withMessage('Geçersiz başlangıç tarihi'),
  query('endDate').optional().isISO8601().withMessage('Geçersiz bitiş tarihi'),
  validateRequest
], async (req, res) => {
  try {
    const calendar = await CalendarService.getCalendarById(req.params.calendarId, req.user.userId, req.user.role);
    
    if (!calendar) {
      return res.status(404).json({ error: 'Takvim bulunamadı' });
    }

    const filters: CalendarFilters = {
      calendarId: req.params.calendarId,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const events = await CalendarService.getEvents(req.user.userId, req.user.role, filters);
    const format = req.query.format as string;

    // For now, return JSON format
    // TODO: Implement ICS and CSV export
    res.json({
      calendar: {
        name: calendar.name,
        description: calendar.description,
        color: calendar.color
      },
      events: events,
      exportedAt: new Date().toISOString(),
      format: format
    });
  } catch (error) {
    console.error('Calendar export error:', error);
    res.status(500).json({ error: 'Takvim dışa aktarılırken hata oluştu' });
  }
});

// Import calendar events
router.post('/import/:calendarId', authenticateJWT, [
  body('events').isArray().withMessage('Etkinlikler dizi olmalıdır'),
  validateRequest
], async (req, res) => {
  try {
    const calendar = await CalendarService.getCalendarById(req.params.calendarId, req.user.userId, req.user.role);
    
    if (!calendar) {
      return res.status(404).json({ error: 'Takvim bulunamadı' });
    }

    const events = req.body.events;
    const importedEvents = [];

    for (const eventData of events) {
      try {
        const event = await CalendarService.createEvent(req.user.userId, {
          ...eventData,
          calendarId: req.params.calendarId
        });
        importedEvents.push(event);
      } catch (error) {
        console.error('Event import error:', error);
        // Continue with other events
      }
    }

    res.json({
      message: `${importedEvents.length} etkinlik başarıyla içe aktarıldı`,
      importedEvents: importedEvents.length,
      totalEvents: events.length
    });
  } catch (error) {
    console.error('Calendar import error:', error);
    res.status(500).json({ error: 'Takvim içe aktarılırken hata oluştu' });
  }
});

export default router;
