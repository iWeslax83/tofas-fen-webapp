import mongoose, { Document, Schema } from 'mongoose';

// Message Interface
export interface IMessage extends Document {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'system';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
  }>;
  replyTo?: string;
  forwardedFrom?: string;
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
  deliveredTo: Array<{
    userId: string;
    deliveredAt: Date;
  }>;
  reactions: Array<{
    userId: string;
    emoji: string;
    createdAt: Date;
  }>;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    duration?: number; // for audio/video
    dimensions?: {
      width: number;
      height: number;
    };
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  isEncrypted: boolean;
  encryptionKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation Interface
export interface IConversation extends Document {
  id: string;
  type: 'direct' | 'group' | 'broadcast' | 'announcement';
  title?: string;
  description?: string;
  participants: Array<{
    userId: string;
    role: 'admin' | 'moderator' | 'member' | 'readonly';
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
  }>;
  admins: string[];
  moderators: string[];
  settings: {
    allowFileSharing: boolean;
    allowVoiceMessages: boolean;
    allowVideoCalls: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    autoArchive: boolean;
    archiveAfterDays: number;
    requireApproval: boolean;
    readReceipts: boolean;
    typingIndicators: boolean;
  };
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
  };
  unreadCount: {
    [userId: string]: number;
  };
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Email Interface
export interface IEmail extends Document {
  id: string;
  from: {
    userId: string;
    email: string;
    name: string;
  };
  to: Array<{
    userId?: string;
    email: string;
    name?: string;
    type: 'to' | 'cc' | 'bcc';
  }>;
  subject: string;
  content: string;
  contentType: 'text' | 'html';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
  replyTo?: string;
  forwardedFrom?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  isEncrypted: boolean;
  encryptionKey?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Room Interface
export interface IChatRoom extends Document {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'restricted';
  category: 'general' | 'academic' | 'social' | 'announcements' | 'support' | 'events';
  maxParticipants?: number;
  currentParticipants: number;
  participants: Array<{
    userId: string;
    role: 'admin' | 'moderator' | 'member' | 'readonly';
    joinedAt: Date;
    isActive: boolean;
  }>;
  admins: string[];
  moderators: string[];
  rules?: string[];
  pinnedMessages: string[];
  settings: {
    allowFileSharing: boolean;
    allowVoiceMessages: boolean;
    allowVideoCalls: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    autoArchive: boolean;
    archiveAfterDays: number;
    requireApproval: boolean;
    readReceipts: boolean;
    typingIndicators: boolean;
    slowMode: boolean;
    slowModeInterval: number; // seconds
  };
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Contact Interface
export interface IContact extends Document {
  id: string;
  userId: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactRole: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  lastSeen?: Date;
  isFavorite: boolean;
  isBlocked: boolean;
  blockedAt?: Date;
  blockReason?: string;
  notes?: string;
  tags: string[];
  groups: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Message Schema
const MessageSchema = new Schema<IMessage>({
  id: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  content: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'audio', 'video', 'location', 'system'],
    default: 'text'
  },
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String }
  }],
  replyTo: { type: String, index: true },
  forwardedFrom: { type: String },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  readBy: [{
    userId: { type: String, required: true },
    readAt: { type: Date, default: Date.now }
  }],
  deliveredTo: [{
    userId: { type: String, required: true },
    deliveredAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    userId: { type: String, required: true },
    emoji: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  metadata: {
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String }
    },
    duration: { type: Number },
    dimensions: {
      width: { type: Number },
      height: { type: Number }
    }
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiresAt: { type: Date, index: true },
  isEncrypted: { type: Boolean, default: false },
  encryptionKey: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Conversation Schema
const ConversationSchema = new Schema<IConversation>({
  id: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['direct', 'group', 'broadcast', 'announcement'],
    required: true
  },
  title: { type: String },
  description: { type: String },
  participants: [{
    userId: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['admin', 'moderator', 'member', 'readonly'],
      default: 'member'
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  admins: [{ type: String }],
  moderators: [{ type: String }],
  settings: {
    allowFileSharing: { type: Boolean, default: true },
    allowVoiceMessages: { type: Boolean, default: true },
    allowVideoCalls: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB
    allowedFileTypes: [{ type: String }],
    autoArchive: { type: Boolean, default: false },
    archiveAfterDays: { type: Number, default: 30 },
    requireApproval: { type: Boolean, default: false },
    readReceipts: { type: Boolean, default: true },
    typingIndicators: { type: Boolean, default: true }
  },
  lastMessage: {
    messageId: { type: String },
    content: { type: String },
    senderId: { type: String },
    senderName: { type: String },
    timestamp: { type: Date }
  },
  unreadCount: { type: Map, of: Number, default: {} },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Email Schema
const EmailSchema = new Schema<IEmail>({
  id: { type: String, required: true, unique: true },
  from: {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true }
  },
  to: [{
    userId: { type: String },
    email: { type: String, required: true },
    name: { type: String },
    type: { 
      type: String, 
      enum: ['to', 'cc', 'bcc'],
      default: 'to'
    }
  }],
  subject: { type: String, required: true },
  content: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['text', 'html'],
    default: 'text'
  },
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true }
  }],
  replyTo: { type: String },
  forwardedFrom: { type: String },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'delivered', 'read', 'failed'],
    default: 'draft'
  },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  failedAt: { type: Date },
  failureReason: { type: String },
  isEncrypted: { type: Boolean, default: false },
  encryptionKey: { type: String },
  expiresAt: { type: Date, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Chat Room Schema
const ChatRoomSchema = new Schema<IChatRoom>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['public', 'private', 'restricted'],
    default: 'public'
  },
  category: { 
    type: String, 
    enum: ['general', 'academic', 'social', 'announcements', 'support', 'events'],
    default: 'general'
  },
  maxParticipants: { type: Number },
  currentParticipants: { type: Number, default: 0 },
  participants: [{
    userId: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['admin', 'moderator', 'member', 'readonly'],
      default: 'member'
    },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  admins: [{ type: String }],
  moderators: [{ type: String }],
  rules: [{ type: String }],
  pinnedMessages: [{ type: String }],
  settings: {
    allowFileSharing: { type: Boolean, default: true },
    allowVoiceMessages: { type: Boolean, default: true },
    allowVideoCalls: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB
    allowedFileTypes: [{ type: String }],
    autoArchive: { type: Boolean, default: false },
    archiveAfterDays: { type: Number, default: 30 },
    requireApproval: { type: Boolean, default: false },
    readReceipts: { type: Boolean, default: true },
    typingIndicators: { type: Boolean, default: true },
    slowMode: { type: Boolean, default: false },
    slowModeInterval: { type: Number, default: 5 } // seconds
  },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Contact Schema
const ContactSchema = new Schema<IContact>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  contactId: { type: String, required: true },
  contactName: { type: String, required: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  contactRole: { type: String, required: true },
  avatar: { type: String },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'away', 'busy', 'invisible'],
    default: 'offline'
  },
  lastSeen: { type: Date },
  isFavorite: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date },
  blockReason: { type: String },
  notes: { type: String },
  tags: [{ type: String }],
  groups: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ 'readBy.userId': 1 });
MessageSchema.index({ 'deliveredTo.userId': 1 });
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ type: 1, isActive: 1 });
ConversationSchema.index({ createdAt: -1 });

EmailSchema.index({ 'from.userId': 1 });
EmailSchema.index({ 'to.userId': 1 });
EmailSchema.index({ status: 1 });
EmailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

ChatRoomSchema.index({ type: 1, category: 1 });
ChatRoomSchema.index({ 'participants.userId': 1 });
ChatRoomSchema.index({ isActive: 1 });

ContactSchema.index({ userId: 1, contactId: 1 }, { unique: true });
ContactSchema.index({ userId: 1, isFavorite: 1 });
ContactSchema.index({ userId: 1, isBlocked: 1 });

// Instance methods
MessageSchema.methods.markAsRead = function(userId: string) {
  const existingRead = this.readBy.find((read: any) => read.userId === userId);
  if (!existingRead) {
    this.readBy.push({ userId, readAt: new Date() });
  }
  return this.save();
};

MessageSchema.methods.markAsDelivered = function(userId: string) {
  const existingDelivery = this.deliveredTo.find((delivery: any) => delivery.userId === userId);
  if (!existingDelivery) {
    this.deliveredTo.push({ userId, deliveredAt: new Date() });
  }
  return this.save();
};

MessageSchema.methods.addReaction = function(userId: string, emoji: string) {
  const existingReaction = this.reactions.find((reaction: any) => reaction.userId === userId);
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.createdAt = new Date();
  } else {
    this.reactions.push({ userId, emoji, createdAt: new Date() });
  }
  return this.save();
};

ConversationSchema.methods.addParticipant = function(userId: string, role: string = 'member') {
  const existingParticipant = this.participants.find((p: any) => p.userId === userId);
  if (!existingParticipant) {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
    this.currentParticipants = this.participants.filter((p: any) => p.isActive).length;
  }
  return this.save();
};

ConversationSchema.methods.removeParticipant = function(userId: string) {
  const participant = this.participants.find((p: any) => p.userId === userId);
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
    this.currentParticipants = this.participants.filter((p: any) => p.isActive).length;
  }
  return this.save();
};

// Static methods
MessageSchema.statics.getUnreadCount = function(userId: string, conversationId: string) {
  return this.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId },
    deleted: false
  });
};

ConversationSchema.statics.getConversationsForUser = function(userId: string) {
  return this.find({
    'participants.userId': userId,
    'participants.isActive': true,
    isActive: true
  }).sort({ updatedAt: -1 });
};

// Export models
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
export const Email = mongoose.model<IEmail>('Email', EmailSchema);
export const ChatRoom = mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);
export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
