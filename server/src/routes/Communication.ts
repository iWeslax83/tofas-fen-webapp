import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CommunicationService } from '../services/CommunicationService';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/communication');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Validation middleware
const validateMessageCreate = [
  body('conversationId').isString().notEmpty(),
  body('content').isString().notEmpty().isLength({ max: 5000 }),
  body('contentType').optional().isIn(['text', 'image', 'file', 'audio', 'video', 'location', 'system']),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('replyTo').optional().isString(),
  body('metadata').optional().isObject()
];

const validateConversationCreate = [
  body('type').isIn(['direct', 'group', 'broadcast', 'announcement']),
  body('title').optional().isString().isLength({ max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('participants').isArray({ min: 1 }),
  body('participants.*').isString(),
  body('admins').optional().isArray(),
  body('admins.*').isString(),
  body('moderators').optional().isArray(),
  body('moderators.*').isString(),
  body('settings').optional().isObject()
];

const validateEmailCreate = [
  body('to').isArray({ min: 1 }),
  body('to.*.email').isEmail(),
  body('to.*.name').optional().isString(),
  body('to.*.type').optional().isIn(['to', 'cc', 'bcc']),
  body('subject').isString().notEmpty().isLength({ max: 200 }),
  body('content').isString().notEmpty(),
  body('contentType').optional().isIn(['text', 'html']),
  body('priority').optional().isIn(['low', 'normal', 'high']),
  body('replyTo').optional().isString()
];

const validateChatRoomCreate = [
  body('name').isString().notEmpty().isLength({ max: 100 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('type').optional().isIn(['public', 'private', 'restricted']),
  body('category').optional().isIn(['general', 'academic', 'social', 'announcements', 'support', 'events']),
  body('maxParticipants').optional().isInt({ min: 1, max: 1000 }),
  body('admins').optional().isArray(),
  body('admins.*').isString(),
  body('moderators').optional().isArray(),
  body('moderators.*').isString(),
  body('rules').optional().isArray(),
  body('rules.*').isString(),
  body('settings').optional().isObject()
];

const validateContactCreate = [
  body('contactId').isString().notEmpty(),
  body('contactName').isString().notEmpty().isLength({ max: 100 }),
  body('contactEmail').optional().isEmail(),
  body('contactPhone').optional().isString(),
  body('contactRole').isString().notEmpty(),
  body('notes').optional().isString().isLength({ max: 500 }),
  body('tags').optional().isArray(),
  body('tags.*').isString(),
  body('groups').optional().isArray(),
  body('groups.*').isString()
];

// Message Routes
router.post('/messages', requireAuth, validateMessageCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const messageData = {
      ...req.body,
      senderId: req.user.id
    };

    const message = await CommunicationService.createMessage(messageData);
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/messages/:conversationId', requireAuth, [
  param('conversationId').isString().notEmpty(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await CommunicationService.getMessages(
      conversationId,
      req.user.id,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/messages/:messageId', requireAuth, [
  param('messageId').isString().notEmpty(),
  body('content').isString().notEmpty().isLength({ max: 5000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const updates = { content: req.body.content };

    const message = await CommunicationService.updateMessage(messageId, req.user.id, updates);
    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/messages/:messageId', requireAuth, [
  param('messageId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    await CommunicationService.deleteMessage(messageId, req.user.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/messages/:messageId/reactions', requireAuth, [
  param('messageId').isString().notEmpty(),
  body('emoji').isString().notEmpty().isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await CommunicationService.addReaction(messageId, req.user.id, emoji);
    res.json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Conversation Routes
router.post('/conversations', requireAuth, validateConversationCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const conversationData = {
      ...req.body,
      participants: [...new Set([req.user.id, ...req.body.participants])] // Ensure current user is included
    };

    const conversation = await CommunicationService.createConversation(conversationData);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/conversations', requireAuth, [
  query('type').optional().isIn(['direct', 'group', 'broadcast', 'announcement']),
  query('isActive').optional().isBoolean(),
  query('isArchived').optional().isBoolean(),
  query('hasUnread').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      type: req.query.type as string,
      isActive: req.query.isActive === 'true',
      isArchived: req.query.isArchived === 'true',
      hasUnread: req.query.hasUnread === 'true'
    };

    const conversations = await CommunicationService.getConversations(req.user.id, filters);
    res.json(conversations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/conversations/:conversationId', requireAuth, [
  param('conversationId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const conversations = await CommunicationService.getConversations(req.user.id);
    const conversation = conversations.find(c => c.id === conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/conversations/:conversationId/participants', requireAuth, [
  param('conversationId').isString().notEmpty(),
  body('userId').isString().notEmpty(),
  body('role').optional().isIn(['admin', 'moderator', 'member', 'readonly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId } = req.params;
    const { userId, role = 'member' } = req.body;

    const conversation = await CommunicationService.addParticipant(conversationId, userId, role);
    res.json(conversation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/conversations/:conversationId/participants/:userId', requireAuth, [
  param('conversationId').isString().notEmpty(),
  param('userId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId, userId } = req.params;
    const conversation = await CommunicationService.removeParticipant(conversationId, userId);
    res.json(conversation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Email Routes
router.post('/emails', requireAuth, validateEmailCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const emailData = {
      ...req.body,
      from: {
        userId: req.user.id,
        email: req.user.email,
        name: req.user.name
      }
    };

    const email = await CommunicationService.createEmail(emailData);
    res.status(201).json(email);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/emails/:emailId/send', requireAuth, [
  param('emailId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emailId } = req.params;
    const email = await CommunicationService.sendEmail(emailId);
    res.json(email);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/emails', requireAuth, [
  query('type').optional().isIn(['sent', 'received']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type = 'received', page = 1, limit = 20 } = req.query;

    const result = await CommunicationService.getEmails(
      req.user.id,
      type as 'sent' | 'received',
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Chat Room Routes
router.post('/chatrooms', requireAuth, validateChatRoomCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const chatRoomData = {
      ...req.body,
      admins: req.body.admins || [req.user.id]
    };

    const chatRoom = await CommunicationService.createChatRoom(chatRoomData);
    res.status(201).json(chatRoom);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/chatrooms', requireAuth, [
  query('type').optional().isIn(['public', 'private', 'restricted']),
  query('category').optional().isIn(['general', 'academic', 'social', 'announcements', 'support', 'events']),
  query('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      type: req.query.type as string,
      category: req.query.category as string,
      isActive: req.query.isActive === 'true'
    };

    const chatRooms = await CommunicationService.getChatRooms(filters);
    res.json(chatRooms);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/chatrooms/:roomId/join', requireAuth, [
  param('roomId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const chatRoom = await CommunicationService.joinChatRoom(roomId, req.user.id);
    res.json(chatRoom);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/chatrooms/:roomId/leave', requireAuth, [
  param('roomId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const chatRoom = await CommunicationService.leaveChatRoom(roomId, req.user.id);
    res.json(chatRoom);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Contact Routes
router.post('/contacts', requireAuth, validateContactCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const contactData = {
      ...req.body,
      userId: req.user.id
    };

    const contact = await CommunicationService.createContact(contactData);
    res.status(201).json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/contacts', requireAuth, [
  query('isFavorite').optional().isBoolean(),
  query('isBlocked').optional().isBoolean(),
  query('tags').optional().isArray(),
  query('tags.*').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filters = {
      isFavorite: req.query.isFavorite === 'true',
      isBlocked: req.query.isBlocked === 'true',
      tags: req.query.tags as string[]
    };

    const contacts = await CommunicationService.getContacts(req.user.id, filters);
    res.json(contacts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/contacts/:contactId/status', requireAuth, [
  param('contactId').isString().notEmpty(),
  body('status').isIn(['online', 'offline', 'away', 'busy', 'invisible'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId } = req.params;
    const { status } = req.body;

    const contact = await CommunicationService.updateContactStatus(contactId, status);
    res.json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/contacts/:contactId/block', requireAuth, [
  param('contactId').isString().notEmpty(),
  body('reason').optional().isString().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId } = req.params;
    const { reason } = req.body;

    const contact = await CommunicationService.blockContact(contactId, reason);
    res.json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/contacts/:contactId/unblock', requireAuth, [
  param('contactId').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contactId } = req.params;
    const contact = await CommunicationService.unblockContact(contactId);
    res.json(contact);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Search and Analytics Routes
router.get('/search', requireAuth, [
  query('q').isString().notEmpty().isLength({ min: 2 }),
  query('conversationId').optional().isString(),
  query('senderId').optional().isString(),
  query('contentType').optional().isString(),
  query('priority').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('hasAttachments').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, ...filters } = req.query;
    const searchFilters = {
      conversationId: filters.conversationId as string,
      senderId: filters.senderId as string,
      contentType: filters.contentType as string,
      priority: filters.priority as string,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom as string) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo as string) : undefined,
      hasAttachments: filters.hasAttachments === 'true'
    };

    const messages = await CommunicationService.searchMessages(req.user.id, q as string, searchFilters);
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await CommunicationService.getCommunicationStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// File Upload Route
router.post('/upload', requireAuth, upload.array('attachments', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = (req.files as Express.Multer.File[]).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/communication/${file.filename}`
    }));

    res.json({ files: uploadedFiles });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
