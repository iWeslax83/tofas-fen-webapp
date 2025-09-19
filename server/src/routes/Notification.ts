import { Router } from "express";
import { Notification } from "../models";
import { NotificationService } from "../services/NotificationService";
import { requireAuth, requireRole } from "../middleware/auth";
import { sendMail } from "../mailService";
import logger from "../utils/logger";

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get user's notifications with pagination and filters
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      read,
      type,
      category,
      priority,
      includeArchived = false
    } = req.query;

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type: type as string,
      category: category as string,
      priority: priority as string,
      includeArchived: includeArchived === 'true'
    };

    const result = await NotificationService.getUserNotifications(userId, options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit)
      },
      unreadCount: result.unreadCount
    });
  } catch (error) {
    logger.error('Error fetching user notifications', { error: error.message, userId: req.params.userId });
    res.status(500).json({ success: false, error: 'Bildirimler getirilemedi' });
  }
});

// Get unread count for user
router.get("/user/:userId/unread-count", async (req, res) => {
  try {
    const { userId } = req.params;
    const unreadCount = await NotificationService.getUnreadCount(userId);
    res.json({ success: true, unreadCount });
  } catch (error) {
    logger.error('Error fetching unread count', { error: error.message });
    res.status(500).json({ success: false, error: 'Okunmamış bildirim sayısı getirilemedi' });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id);
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error marking notification as read', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Bildirim okundu olarak işaretlenemedi' });
  }
});

// Mark multiple notifications as read
router.patch("/bulk-read", async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli bildirim ID\'leri gerekli' });
    }

    await NotificationService.markMultipleAsRead(notificationIds);
    res.json({ success: true, message: `${notificationIds.length} bildirim okundu olarak işaretlendi` });
  } catch (error) {
    logger.error('Error marking multiple notifications as read', { error: error.message });
    res.status(500).json({ success: false, error: 'Bildirimler okundu olarak işaretlenemedi' });
  }
});

// Archive notification
router.patch("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationService.archiveNotification(id);
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error archiving notification', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Bildirim arşivlenemedi' });
  }
});

// Create single notification (admin only)
router.post("/", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const notificationData = req.body;
    const notification = await NotificationService.createNotification(notificationData);
    
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error creating notification', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Bildirim oluşturulamadı' });
  }
});

// Create bulk notifications (admin only)
router.post("/bulk", requireRole(['admin']), async (req, res) => {
  try {
    const { userIds, ...notificationData } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli kullanıcı ID\'leri gerekli' });
    }

    const notifications = await NotificationService.createBulkNotifications({
      ...notificationData,
      userIds
    });
    
    res.status(201).json({ 
      success: true, 
      data: notifications,
      message: `${notifications.length} kullanıcıya bildirim gönderildi`
    });
  } catch (error) {
    logger.error('Error creating bulk notifications', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Toplu bildirimler oluşturulamadı' });
  }
});

// Create role-based notifications (admin only)
router.post("/role-based", requireRole(['admin']), async (req, res) => {
  try {
    const { roles, ...notificationData } = req.body;
    
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli roller gerekli' });
    }

    const notifications = await NotificationService.createRoleBasedNotifications({
      ...notificationData,
      roles
    });
    
    res.status(201).json({ 
      success: true, 
      data: notifications,
      message: `${notifications.length} kullanıcıya bildirim gönderildi`
    });
  } catch (error) {
    logger.error('Error creating role-based notifications', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Rol tabanlı bildirimler oluşturulamadı' });
  }
});

// Delete notification (admin only)
router.delete("/:id", requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, message: 'Bildirim silindi' });
  } catch (error) {
    logger.error('Error deleting notification', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Bildirim silinemedi' });
  }
});

// Delete expired notifications (admin only)
router.delete("/expired", requireRole(['admin']), async (req, res) => {
  try {
    const deletedCount = await NotificationService.deleteExpiredNotifications();
    res.json({ 
      success: true, 
      message: `${deletedCount} süresi dolmuş bildirim silindi`,
      deletedCount 
    });
  } catch (error) {
    logger.error('Error deleting expired notifications', { error: error.message });
    res.status(500).json({ success: false, error: 'Süresi dolmuş bildirimler silinemedi' });
  }
});

// Get notification statistics (admin only)
router.get("/stats", requireRole(['admin']), async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const todayNotifications = await Notification.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    const typeStats = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    const priorityStats = await Notification.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        unread: unreadNotifications,
        today: todayNotifications,
        byType: typeStats,
        byPriority: priorityStats
      }
    });
  } catch (error) {
    logger.error('Error fetching notification stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Bildirim istatistikleri getirilemedi' });
  }
});

// Test email notification (admin only)
router.post("/test-email", requireRole(['admin']), async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    
    if (!to || !subject || !text) {
      return res.status(400).json({ success: false, error: 'E-posta bilgileri eksik' });
    }

    const info = await sendMail(to, subject, text);
    res.json({ success: true, info });
  } catch (error) {
    logger.error('Error sending test email', { error: error.message });
    res.status(500).json({ success: false, error: 'Test e-postası gönderilemedi' });
  }
});

// Get notification by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error fetching notification by ID', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Bildirim getirilemedi' });
  }
});

// Get all notifications for admin (with pagination and filters)
router.get("/admin", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      priority,
      read,
      search
    } = req.query;

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      type: type as string,
      category: category as string,
      priority: priority as string,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      search: search as string
    };

    const result = await NotificationService.getAdminNotifications(options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching admin notifications', { error: error.message });
    res.status(500).json({ success: false, error: 'Bildirimler getirilemedi' });
  }
});

// Get notification statistics
router.get("/stats", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const stats = await NotificationService.getNotificationStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching notification stats', { error: error.message });
    res.status(500).json({ success: false, error: 'İstatistikler getirilemedi' });
  }
});

// Get notification templates
router.get("/templates", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const templates = await NotificationService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Error fetching notification templates', { error: error.message });
    res.status(500).json({ success: false, error: 'Şablonlar getirilemedi' });
  }
});

// Create notification template
router.post("/templates", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const templateData = req.body;
    const template = await NotificationService.createTemplate(templateData);
    
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    logger.error('Error creating notification template', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Şablon oluşturulamadı' });
  }
});

// Bulk mark as read
router.patch("/bulk-read", async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli bildirim ID\'leri gerekli' });
    }

    await NotificationService.markMultipleAsRead(notificationIds);
    
    res.json({ success: true, message: 'Bildirimler okundu olarak işaretlendi' });
  } catch (error) {
    logger.error('Error marking multiple notifications as read', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Bildirimler işaretlenemedi' });
  }
});

// Bulk mark as unread
router.patch("/bulk-unread", async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli bildirim ID\'leri gerekli' });
    }

    await NotificationService.markMultipleAsUnread(notificationIds);
    
    res.json({ success: true, message: 'Bildirimler okunmamış olarak işaretlendi' });
  } catch (error) {
    logger.error('Error marking multiple notifications as unread', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Bildirimler işaretlenemedi' });
  }
});

// Bulk archive
router.patch("/bulk-archive", async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli bildirim ID\'leri gerekli' });
    }

    await NotificationService.archiveMultipleNotifications(notificationIds);
    
    res.json({ success: true, message: 'Bildirimler arşivlendi' });
  } catch (error) {
    logger.error('Error archiving multiple notifications', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Bildirimler arşivlenemedi' });
  }
});

// Bulk delete
router.delete("/bulk-delete", requireRole(['admin']), async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Geçerli bildirim ID\'leri gerekli' });
    }

    await NotificationService.deleteMultipleNotifications(notificationIds);
    
    res.json({ success: true, message: 'Bildirimler silindi' });
  } catch (error) {
    logger.error('Error deleting multiple notifications', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Bildirimler silinemedi' });
  }
});

// Automation routes
router.get("/automation/rules", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { NotificationAutomationService } = await import('../services/NotificationAutomationService');
    const rules = NotificationAutomationService.getRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error('Error fetching automation rules', { error: error.message });
    res.status(500).json({ success: false, error: 'Otomasyon kuralları getirilemedi' });
  }
});

router.post("/automation/rules", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { NotificationAutomationService } = await import('../services/NotificationAutomationService');
    const rule = NotificationAutomationService.addRule(req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    logger.error('Error creating automation rule', { error: error.message, data: req.body });
    res.status(500).json({ success: false, error: 'Otomasyon kuralı oluşturulamadı' });
  }
});

router.put("/automation/rules/:id", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { NotificationAutomationService } = await import('../services/NotificationAutomationService');
    const success = NotificationAutomationService.updateRule(id, req.body);
    
    if (success) {
      res.json({ success: true, message: 'Otomasyon kuralı güncellendi' });
    } else {
      res.status(404).json({ success: false, error: 'Otomasyon kuralı bulunamadı' });
    }
  } catch (error) {
    logger.error('Error updating automation rule', { error: error.message, id: req.params.id, data: req.body });
    res.status(500).json({ success: false, error: 'Otomasyon kuralı güncellenemedi' });
  }
});

router.delete("/automation/rules/:id", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { NotificationAutomationService } = await import('../services/NotificationAutomationService');
    const success = NotificationAutomationService.deleteRule(id);
    
    if (success) {
      res.json({ success: true, message: 'Otomasyon kuralı silindi' });
    } else {
      res.status(404).json({ success: false, error: 'Otomasyon kuralı bulunamadı' });
    }
  } catch (error) {
    logger.error('Error deleting automation rule', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Otomasyon kuralı silinemedi' });
  }
});

router.patch("/automation/rules/:id/toggle", requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const { NotificationAutomationService } = await import('../services/NotificationAutomationService');
    const success = NotificationAutomationService.toggleRule(id, enabled);
    
    if (success) {
      res.json({ success: true, message: `Otomasyon kuralı ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}` });
    } else {
      res.status(404).json({ success: false, error: 'Otomasyon kuralı bulunamadı' });
    }
  } catch (error) {
    logger.error('Error toggling automation rule', { error: error.message, id: req.params.id, enabled: req.body.enabled });
    res.status(500).json({ success: false, error: 'Otomasyon kuralı durumu değiştirilemedi' });
  }
});

export default router; 