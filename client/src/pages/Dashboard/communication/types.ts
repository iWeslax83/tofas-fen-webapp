export interface Message {
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
  edited: boolean;
  deleted: boolean;
  readBy: Array<{ userId: string; readAt: Date }>;
  reactions: Array<{ userId: string; emoji: string; createdAt: Date }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'broadcast' | 'announcement';
  title?: string;
  description?: string;
  participants: Array<{
    userId: string;
    role: 'admin' | 'moderator' | 'member' | 'readonly';
    joinedAt: Date;
    isActive: boolean;
  }>;
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    senderName: string;
    timestamp: Date;
  };
  unreadCount: { [userId: string]: number };
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Email {
  id: string;
  from: { userId: string; email: string; name: string };
  to: Array<{ userId?: string; email: string; name?: string; type: 'to' | 'cc' | 'bcc' }>;
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
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  createdAt: Date;
}

export interface ChatRoom {
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
  isActive: boolean;
  createdAt: Date;
}

export interface Contact {
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
  notes?: string;
  tags: string[];
  groups: string[];
  createdAt: Date;
}

export type ActiveTab = 'messages' | 'conversations' | 'emails' | 'chatrooms' | 'contacts';

export interface Filters {
  type: string;
  category: string;
  status: string;
  priority: string;
  hasAttachments: boolean;
  unreadOnly: boolean;
}
