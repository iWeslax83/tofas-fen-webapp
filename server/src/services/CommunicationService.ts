import { Message, Conversation, Email, ChatRoom, Contact, IMessage, IConversation, IEmail, IChatRoom, IContact } from '../models/Communication';
import { User } from '../models/User';
import { NotificationService } from './NotificationService';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface MessageCreateData {
  conversationId: string;
  senderId: string;
  content: string;
  contentType?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'system';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
  }>;
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    duration?: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

export interface ConversationCreateData {
  type: 'direct' | 'group' | 'broadcast' | 'announcement';
  title?: string;
  description?: string;
  participants: string[];
  admins?: string[];
  moderators?: string[];
  settings?: {
    allowFileSharing?: boolean;
    allowVoiceMessages?: boolean;
    allowVideoCalls?: boolean;
    maxFileSize?: number;
    allowedFileTypes?: string[];
    autoArchive?: boolean;
    archiveAfterDays?: number;
    requireApproval?: boolean;
    readReceipts?: boolean;
    typingIndicators?: boolean;
  };
}

export interface EmailCreateData {
  from: {
    userId: string;
    email: string;
    name: string;
  };
  to: Array<{
    userId?: string;
    email: string;
    name?: string;
    type?: 'to' | 'cc' | 'bcc';
  }>;
  subject: string;
  content: string;
  contentType?: 'text' | 'html';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface ChatRoomCreateData {
  name: string;
  description?: string;
  type?: 'public' | 'private' | 'restricted';
  category?: 'general' | 'academic' | 'social' | 'announcements' | 'support' | 'events';
  maxParticipants?: number;
  admins?: string[];
  moderators?: string[];
  rules?: string[];
  settings?: {
    allowFileSharing?: boolean;
    allowVoiceMessages?: boolean;
    allowVideoCalls?: boolean;
    maxFileSize?: number;
    allowedFileTypes?: string[];
    autoArchive?: boolean;
    archiveAfterDays?: number;
    requireApproval?: boolean;
    readReceipts?: boolean;
    typingIndicators?: boolean;
    slowMode?: boolean;
    slowModeInterval?: number;
  };
}

export interface ContactCreateData {
  userId: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole: string;
  avatar?: string;
  notes?: string;
  tags?: string[];
  groups?: string[];
}

export interface MessageFilters {
  conversationId?: string;
  senderId?: string;
  contentType?: string;
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
  read?: boolean;
  hasAttachments?: boolean;
}

export interface ConversationFilters {
  type?: string;
  participantId?: string;
  isActive?: boolean;
  isArchived?: boolean;
  hasUnread?: boolean;
}

export class CommunicationService {
  // Message Management
  static async createMessage(data: MessageCreateData): Promise<IMessage> {
    const sender = await User.findById(data.senderId);
    if (!sender) {
      throw new Error('Sender not found');
    }

    const conversation = await Conversation.findById(data.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => p.userId === data.senderId && p.isActive);
    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    const message = new Message({
      id: uuidv4(),
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: sender.adSoyad,
      senderRole: sender.rol,
      content: data.content,
      contentType: data.contentType || 'text',
      attachments: data.attachments || [],
      replyTo: data.replyTo,
      priority: data.priority || 'normal',
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await message.save();

    // Update conversation last message
    conversation.lastMessage = {
      messageId: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.senderName,
      timestamp: message.createdAt
    };

    // Update unread count for other participants
    conversation.participants.forEach((participant: any) => {
      if (participant.userId !== data.senderId && participant.isActive) {
        const current = (conversation.unreadCount as any).get(participant.userId) || 0;
        (conversation.unreadCount as any).set(participant.userId, current + 1);
      }
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    // Send notifications to participants
    await this.notifyMessageParticipants(message, conversation);

    return message;
  }

  static async getMessages(conversationId: string, userId: string, page: number = 1, limit: number = 50): Promise<{ messages: IMessage[], total: number }> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.participants.some(p => p.userId === userId && p.isActive);
    if (!isParticipant) {
      throw new Error('User is not a participant in this conversation');
    }

    const skip = (page - 1) * limit;
    const messages = await Message.find({
      conversationId,
      deleted: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('replyTo', 'content senderName');

    const total = await Message.countDocuments({
      conversationId,
      deleted: false
    });

    // Mark messages as read
    const unreadMessages = messages.filter((msg: any) => 
      msg.senderId !== userId && 
      !msg.readBy.some((read: any) => read.userId === userId)
    );

    for (const message of unreadMessages as any[]) {
      await (message as any).markAsRead(userId);
    }

    return { messages: messages.reverse(), total };
  }

  static async updateMessage(messageId: string, userId: string, updates: Partial<MessageCreateData>): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('User can only edit their own messages');
    }

    if (message.deleted) {
      throw new Error('Cannot edit deleted message');
    }

    Object.assign(message, {
      ...updates,
      edited: true,
      editedAt: new Date(),
      updatedAt: new Date()
    });

    await message.save();
    return message;
  }

  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('User can only delete their own messages');
    }

    message.deleted = true;
    message.deletedAt = new Date();
    message.updatedAt = new Date();
    await message.save();
  }

  static async addReaction(messageId: string, userId: string, emoji: string): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.deleted) {
      throw new Error('Cannot react to deleted message');
    }

    await (message as any).addReaction(userId, emoji);
    return message;
  }

  // Conversation Management
  static async createConversation(data: ConversationCreateData): Promise<IConversation> {
    const participants = await User.find({ _id: { $in: data.participants } });
    if (participants.length !== data.participants.length) {
      throw new Error('Some participants not found');
    }

    const conversation = new Conversation({
      id: uuidv4(),
      type: data.type,
      title: data.title,
      description: data.description,
      participants: data.participants.map(userId => ({
        userId,
        role: data.admins?.includes(userId) ? 'admin' : 
              data.moderators?.includes(userId) ? 'moderator' : 'member',
        joinedAt: new Date(),
        isActive: true
      })),
      admins: data.admins || [data.participants[0]],
      moderators: data.moderators || [],
      settings: {
        allowFileSharing: data.settings?.allowFileSharing ?? true,
        allowVoiceMessages: data.settings?.allowVoiceMessages ?? true,
        allowVideoCalls: data.settings?.allowVideoCalls ?? true,
        maxFileSize: data.settings?.maxFileSize ?? 10 * 1024 * 1024,
        allowedFileTypes: data.settings?.allowedFileTypes || [],
        autoArchive: data.settings?.autoArchive ?? false,
        archiveAfterDays: data.settings?.archiveAfterDays ?? 30,
        requireApproval: data.settings?.requireApproval ?? false,
        readReceipts: data.settings?.readReceipts ?? true,
        typingIndicators: data.settings?.typingIndicators ?? true
      },
      unreadCount: new Map(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await conversation.save();

    // Send notifications to participants
    await this.notifyConversationCreated(conversation);

    return conversation;
  }

  static async getConversations(userId: string, filters?: ConversationFilters): Promise<IConversation[]> {
    let query: any = {
      'participants.userId': userId,
      'participants.isActive': true
    };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .populate('participants.userId', 'name role avatar');

    if (filters?.hasUnread) {
      return (conversations as any[]).filter((conv: any) => (conv.unreadCount?.get(userId) || 0) > 0);
    }

    return conversations as any;
  }

  static async addParticipant(conversationId: string, userId: string, role: string = 'member'): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await (conversation as any).addParticipant(userId, role);
    return conversation as any;
  }

  static async removeParticipant(conversationId: string, userId: string): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await (conversation as any).removeParticipant(userId);
    return conversation as any;
  }

  // Email Management
  static async createEmail(data: EmailCreateData): Promise<IEmail> {
    const email = new Email({
      id: uuidv4(),
      from: data.from,
      to: data.to.map(recipient => ({
        ...recipient,
        type: recipient.type || 'to'
      })),
      subject: data.subject,
      content: data.content,
      contentType: data.contentType || 'text',
      attachments: data.attachments || [],
      replyTo: data.replyTo,
      priority: data.priority || 'normal',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await email.save();
    return email;
  }

  static async sendEmail(emailId: string): Promise<IEmail> {
    const email = await Email.findById(emailId);
    if (!email) {
      throw new Error('Email not found');
    }

    if (email.status !== 'draft') {
      throw new Error('Email is not in draft status');
    }

    email.status = 'sent';
    email.sentAt = new Date();
    email.updatedAt = new Date();
    await email.save();

    // Send email via mail service
    try {
      // Implementation would depend on your mail service
      // await mailService.sendEmail(email);
      email.status = 'delivered';
      email.deliveredAt = new Date();
      await email.save();
    } catch (error) {
      email.status = 'failed';
      email.failedAt = new Date();
      email.failureReason = error.message;
      await email.save();
    }

    return email;
  }

  static async getEmails(userId: string, type: 'sent' | 'received' = 'received', page: number = 1, limit: number = 20): Promise<{ emails: IEmail[], total: number }> {
    const skip = (page - 1) * limit;
    let query: any;

    if (type === 'sent') {
      query = { 'from.userId': userId };
    } else {
      query = { 'to.userId': userId };
    }

    const emails = await Email.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Email.countDocuments(query);

    return { emails, total };
  }

  // Chat Room Management
  static async createChatRoom(data: ChatRoomCreateData): Promise<IChatRoom> {
    const chatRoom = new ChatRoom({
      id: uuidv4(),
      name: data.name,
      description: data.description,
      type: data.type || 'public',
      category: data.category || 'general',
      maxParticipants: data.maxParticipants,
      currentParticipants: 0,
      participants: [],
      admins: data.admins || [],
      moderators: data.moderators || [],
      rules: data.rules || [],
      pinnedMessages: [],
      settings: {
        allowFileSharing: data.settings?.allowFileSharing ?? true,
        allowVoiceMessages: data.settings?.allowVoiceMessages ?? true,
        allowVideoCalls: data.settings?.allowVideoCalls ?? true,
        maxFileSize: data.settings?.maxFileSize ?? 10 * 1024 * 1024,
        allowedFileTypes: data.settings?.allowedFileTypes || [],
        autoArchive: data.settings?.autoArchive ?? false,
        archiveAfterDays: data.settings?.archiveAfterDays ?? 30,
        requireApproval: data.settings?.requireApproval ?? false,
        readReceipts: data.settings?.readReceipts ?? true,
        typingIndicators: data.settings?.typingIndicators ?? true,
        slowMode: data.settings?.slowMode ?? false,
        slowModeInterval: data.settings?.slowModeInterval ?? 5
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await chatRoom.save();
    return chatRoom;
  }

  static async getChatRooms(filters?: { type?: string; category?: string; isActive?: boolean }): Promise<IChatRoom[]> {
    let query: any = {};

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    return await ChatRoom.find(query)
      .sort({ createdAt: -1 })
      .populate('participants.userId', 'name role avatar');
  }

  static async joinChatRoom(roomId: string, userId: string): Promise<IChatRoom> {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    if (!chatRoom.isActive) {
      throw new Error('Chat room is not active');
    }

    if (chatRoom.maxParticipants && chatRoom.currentParticipants >= chatRoom.maxParticipants) {
      throw new Error('Chat room is full');
    }

    const existingParticipant = chatRoom.participants.find(p => p.userId === userId);
    if (existingParticipant && existingParticipant.isActive) {
      throw new Error('User is already a participant');
    }

    if (existingParticipant) {
      existingParticipant.isActive = true;
    } else {
      chatRoom.participants.push({
        userId,
        role: 'member',
        joinedAt: new Date(),
        isActive: true
      });
    }

    chatRoom.currentParticipants = chatRoom.participants.filter(p => p.isActive).length;
    chatRoom.updatedAt = new Date();
    await chatRoom.save();

    return chatRoom;
  }

  static async leaveChatRoom(roomId: string, userId: string): Promise<IChatRoom> {
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    const participant = chatRoom.participants.find(p => p.userId === userId);
    if (!participant || !participant.isActive) {
      throw new Error('User is not a participant');
    }

    participant.isActive = false;
    chatRoom.currentParticipants = chatRoom.participants.filter(p => p.isActive).length;
    chatRoom.updatedAt = new Date();
    await chatRoom.save();

    return chatRoom;
  }

  // Contact Management
  static async createContact(data: ContactCreateData): Promise<IContact> {
    const existingContact = await Contact.findOne({
      userId: data.userId,
      contactId: data.contactId
    });

    if (existingContact) {
      throw new Error('Contact already exists');
    }

    const contact = new Contact({
      id: uuidv4(),
      userId: data.userId,
      contactId: data.contactId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      contactRole: data.contactRole,
      avatar: data.avatar,
      status: 'offline',
      isFavorite: false,
      isBlocked: false,
      notes: data.notes,
      tags: data.tags || [],
      groups: data.groups || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await contact.save();
    return contact;
  }

  static async getContacts(userId: string, filters?: { isFavorite?: boolean; isBlocked?: boolean; tags?: string[] }): Promise<IContact[]> {
    let query: any = { userId };

    if (filters?.isFavorite !== undefined) {
      query.isFavorite = filters.isFavorite;
    }

    if (filters?.isBlocked !== undefined) {
      query.isBlocked = filters.isBlocked;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    return await Contact.find(query)
      .sort({ contactName: 1 })
      .populate('contactId', 'name role avatar status lastSeen');
  }

  static async updateContactStatus(contactId: string, status: 'online' | 'offline' | 'away' | 'busy' | 'invisible'): Promise<IContact> {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    contact.status = status;
    if (status === 'offline') {
      contact.lastSeen = new Date();
    }
    contact.updatedAt = new Date();
    await contact.save();

    return contact;
  }

  static async blockContact(contactId: string, reason?: string): Promise<IContact> {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    contact.isBlocked = true;
    contact.blockedAt = new Date();
    contact.blockReason = reason;
    contact.updatedAt = new Date();
    await contact.save();

    return contact;
  }

  static async unblockContact(contactId: string): Promise<IContact> {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    contact.isBlocked = false;
    contact.blockedAt = undefined;
    contact.blockReason = undefined;
    contact.updatedAt = new Date();
    await contact.save();

    return contact;
  }

  // Search and Analytics
  static async searchMessages(userId: string, query: string, filters?: MessageFilters): Promise<IMessage[]> {
    let searchQuery: any = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { senderName: { $regex: query, $options: 'i' } }
      ],
      deleted: false
    };

    if (filters?.conversationId) {
      searchQuery.conversationId = filters.conversationId;
    }

    if (filters?.senderId) {
      searchQuery.senderId = filters.senderId;
    }

    if (filters?.contentType) {
      searchQuery.contentType = filters.contentType;
    }

    if (filters?.priority) {
      searchQuery.priority = filters.priority;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      searchQuery.createdAt = {};
      if (filters.dateFrom) searchQuery.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) searchQuery.createdAt.$lte = filters.dateTo;
    }

    if (filters?.hasAttachments) {
      searchQuery['attachments.0'] = { $exists: true };
    }

    return await Message.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(100);
  }

  static async getCommunicationStats(userId: string): Promise<any> {
    const stats = await Message.aggregate([
      { $match: { senderId: userId } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          totalConversations: { $addToSet: '$conversationId' },
          messagesByType: {
            $push: {
              contentType: '$contentType',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            }
          }
        }
      },
      {
        $project: {
          totalMessages: 1,
          totalConversations: { $size: '$totalConversations' },
          messagesByType: 1
        }
      }
    ]);

    const unreadCount = await Message.countDocuments({
      'readBy.userId': { $ne: userId },
      senderId: { $ne: userId },
      deleted: false
    });

    return {
      ...stats[0],
      unreadCount
    };
  }

  // Notification helpers
  private static async notifyMessageParticipants(message: IMessage, conversation: IConversation): Promise<void> {
    const participants = conversation.participants.filter(p => 
      p.userId !== message.senderId && p.isActive
    );

    for (const participant of participants) {
      await NotificationService.createNotification({
        userId: participant.userId,
        title: `Yeni Mesaj`,
        message: `${message.senderName}: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`,
        type: 'info',
        category: 'social',
        actionUrl: `/iletisim/konusma/${conversation.id}`,
        priority: message.priority === 'urgent' ? 'high' : 'medium'
      });
    }
  }

  private static async notifyConversationCreated(conversation: IConversation): Promise<void> {
    const participants = conversation.participants.filter(p => p.isActive);

    for (const participant of participants) {
      await NotificationService.createNotification({
        userId: participant.userId,
        title: `Yeni Konuşma`,
        message: conversation.title ? 
          `"${conversation.title}" konuşmasına eklendiniz` : 
          'Yeni bir konuşmaya eklendiniz',
        type: 'announcement',
        category: 'social',
        actionUrl: `/iletisim/konusma/${conversation.id}`,
        priority: 'medium'
      });
    }
  }
}
