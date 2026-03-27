import { Router, Request, Response } from 'express';
import { Message, Conversation } from '../models/Communication';
import { User } from '../models/User';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateId() {
  try {
    return uuidv4();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

// Ziyaretci or Admin: Get or create a visitor conversation
router.post(
  '/conversation',
  authenticateJWT,
  authorizeRoles(['ziyaretci', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;

      // Find existing visitor conversation for this user
      let conversation = await Conversation.findOne({
        'participants.userId': authUser.userId,
        type: 'group',
        title: { $regex: /^Ziyaret[cç]i Sohbet/ },
      });

      if (!conversation) {
        // Create new conversation including all admins
        const admins = await User.find({ rol: 'admin', isActive: true });
        const adminIds = admins.map((a) => a.id);
        const user = await User.findOne({ id: authUser.userId });

        const participants = [
          { userId: authUser.userId, role: 'member', joinedAt: new Date(), isActive: true },
          ...adminIds.map((id) => ({
            userId: id,
            role: 'admin',
            joinedAt: new Date(),
            isActive: true,
          })),
        ];

        conversation = new Conversation({
          id: generateId(),
          type: 'group',
          title: `Ziyaretçi Sohbet - ${user?.adSoyad || authUser.userId}`,
          description: 'Yeni kayıt ziyaretçi ile yönetici iletişim kanalı',
          participants,
          admins: adminIds,
          settings: {
            allowFileSharing: false,
            allowVoiceMessages: false,
            allowVideoCalls: false,
            maxFileSize: 5 * 1024 * 1024,
            allowedFileTypes: [],
            autoArchive: false,
            archiveAfterDays: 30,
            requireApproval: false,
            readReceipts: true,
            typingIndicators: true,
          },
          isActive: true,
          isArchived: false,
        });

        await conversation.save();
      }

      res.json(conversation);
    } catch (error) {
      logger.error('Visitor chat conversation error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sohbet olusturulurken hata olustu' });
    }
  },
);

// Get messages for a visitor conversation
router.get(
  '/messages/:conversationId',
  authenticateJWT,
  authorizeRoles(['ziyaretci', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { conversationId } = req.params;
      const { page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit as string) || 50, 1), 200);

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        id: conversationId,
        'participants.userId': authUser.userId,
        'participants.isActive': true,
      });

      if (!conversation) {
        return res.status(403).json({ error: 'Bu sohbete erisim yetkiniz yok' });
      }

      const messages = await Message.find({ conversationId, deleted: false })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      const total = await Message.countDocuments({ conversationId, deleted: false });

      res.json({ messages: messages.reverse(), total, page: pageNum, limit: limitNum });
    } catch (error) {
      res.status(500).json({ error: 'Mesajlar alinirken hata olustu' });
    }
  },
);

// Send message in visitor conversation
router.post(
  '/messages',
  authenticateJWT,
  authorizeRoles(['ziyaretci', 'admin']),
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { conversationId, content } = req.body;

      if (!conversationId || !content) {
        return res.status(400).json({ error: 'Konusma ID ve mesaj icerigi gerekli' });
      }

      if (typeof content !== 'string' || !content.trim() || content.trim().length > 2000) {
        return res.status(400).json({ error: 'Mesaj bos olamaz ve 2000 karakterden uzun olamaz' });
      }

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        id: conversationId,
        'participants.userId': authUser.userId,
        'participants.isActive': true,
      });

      if (!conversation) {
        return res.status(403).json({ error: 'Bu sohbete erisim yetkiniz yok' });
      }

      const user = await User.findOne({ id: authUser.userId });

      const message = new Message({
        id: generateId(),
        conversationId,
        senderId: authUser.userId,
        senderName: user?.adSoyad || 'Bilinmeyen',
        senderRole: authUser.role,
        content: content.trim(),
        contentType: 'text',
        priority: 'normal',
        isEncrypted: false,
      });

      await message.save();

      // Update conversation's last message
      conversation.lastMessage = {
        messageId: message.id,
        content: content.substring(0, 100),
        senderId: authUser.userId,
        senderName: user?.adSoyad || 'Bilinmeyen',
        timestamp: new Date(),
      };
      await conversation.save();

      res.status(201).json(message);
    } catch (error) {
      logger.error('Visitor chat send message error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Mesaj gonderilirken hata olustu' });
    }
  },
);

// Admin: Get all visitor conversations
router.get(
  '/conversations',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (_req: Request, res: Response) => {
    try {
      const conversations = await Conversation.find({
        type: 'group',
        title: { $regex: /^Ziyaret[cç]i Sohbet/ },
        isActive: true,
      }).sort({ updatedAt: -1 });

      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: 'Sohbetler alınırken hata oluştu' });
    }
  },
);

export default router;
