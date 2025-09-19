import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Mail, 
  MessageCircle, 
  UserPlus, 
  Search, 
  Filter,
  Plus,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Trash2,
  // Block,
  Download,
  Image,
  Video as VideoIcon,
  Music,
  File
} from 'lucide-react';
import { SecureAPI } from '../../utils/api';
import './CommunicationPage.css';

interface Message {
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

interface Conversation {
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

interface Email {
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

interface ChatRoom {
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

interface Contact {
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

const CommunicationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'conversations' | 'emails' | 'chatrooms' | 'contacts'>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // const [showContactModal, setShowContactModal] = useState(false); // Not used
  // const [showEmailModal, setShowEmailModal] = useState(false); // Not used
  // const [showChatRoomModal, setShowChatRoomModal] = useState(false); // Not used
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // const [typingUsers, setTypingUsers] = useState<string[]>([]); // Not used
  // const [isTyping, setIsTyping] = useState(false); // Not used
  const [page] = useState(1);
  // const [totalPages] = useState(1); // Not used
  const [sortBy] = useState<'date' | 'name' | 'unread'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    status: '',
    priority: '',
    hasAttachments: false,
    unreadOnly: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'messages':
        case 'conversations': {
          const conversationsData = await SecureAPI.get('/api/communication/conversations', {
            params: { ...filters, sortBy, sortOrder, page }
          });
          setConversations((conversationsData as { data: Conversation[] }).data);
          setTotalPages(Math.ceil((conversationsData as { total: number }).total / 20));
          break;
        }

        case 'emails': {
          const emailsData = await SecureAPI.get('/api/communication/emails', {
            params: { type: 'received', page, ...filters }
          });
          setEmails((emailsData as { data: Email[] }).data);
          setTotalPages(Math.ceil((emailsData as { total: number }).total / 20));
          break;
        }

        case 'chatrooms': {
          const chatRoomsData = await SecureAPI.get('/api/communication/chatrooms', {
            params: { ...filters, page }
          });
          setChatRooms((chatRoomsData as { data: ChatRoom[] }).data);
          setTotalPages(Math.ceil((chatRoomsData as { total: number }).total / 20));
          break;
        }

        case 'contacts': {
          const contactsData = await SecureAPI.get('/api/communication/contacts', {
            params: { ...filters, page }
          });
          setContacts((contactsData as { data: Contact[] }).data);
          setTotalPages(Math.ceil((contactsData as { total: number }).total / 20));
          break;
        }
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, sortBy, sortOrder, filters]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await SecureAPI.get(`/api/communication/messages/${conversationId}`, {
        params: { page: 1, limit: 50 }
      });
      setMessages((response as { data: { messages: Message[] } }).data.messages);
      scrollToBottom();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Mesajlar yüklenirken hata oluştu');
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!selectedConversation) return;

    try {
      const messageData: { conversationId: string; content: string; attachments?: File[]; contentType?: string } = {
        conversationId: selectedConversation.id,
        content: newMessage,
        contentType: 'text'
      };

      // Handle file uploads
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('attachments', file);
        });

        const uploadResponse = await SecureAPI.post('/api/communication/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        messageData.attachments = (uploadResponse as { data: { files: File[] } }).data.files;
        messageData.contentType = 'file';
      }

      await SecureAPI.post('/api/communication/messages', messageData);
      
      setNewMessage('');
      setSelectedFiles([]);
      fetchMessages(selectedConversation.id);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Mesaj gönderilirken hata oluştu');
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  // Handle file removal
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }

    try {
      const response = await SecureAPI.get('/api/communication/search', {
        params: { q: searchQuery, ...filters }
      });
      
      if (activeTab === 'messages') {
        setMessages((response as { data: Message[] }).data);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Arama yapılırken hata oluştu');
    }
  }, [searchQuery, filters, activeTab, fetchData]);

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image size={16} />;
    if (mimeType.startsWith('video/')) return <VideoIcon size={16} />;
    if (mimeType.startsWith('audio/')) return <Music size={16} />;
    return <File size={16} />;
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Dün';
    } else {
      return messageDate.toLocaleDateString('tr-TR');
    }
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, [activeTab, page, sortBy, sortOrder, filters, fetchData]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    const timeout = setTimeout(handleSearch, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const tabs = [
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare },
    { id: 'conversations', label: 'Konuşmalar', icon: Users },
    { id: 'emails', label: 'E-posta', icon: Mail },
    { id: 'chatrooms', label: 'Sohbet Odaları', icon: MessageCircle },
    { id: 'contacts', label: 'Kişiler', icon: UserPlus }
  ];

  return (
    <div className="communication-page">
      {/* Header */}
      <div className="communication-header">
        <div className="header-left">
          <h1>İletişim Modülü</h1>
          <p>Mesajlaşma, e-posta ve sohbet odaları</p>
        </div>
        <div className="header-right">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            Yeni {activeTab === 'messages' ? 'Mesaj' : 
                  activeTab === 'emails' ? 'E-posta' : 
                  activeTab === 'chatrooms' ? 'Sohbet Odası' : 'Kişi'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="communication-tabs">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as 'messages' | 'emails' | 'chatrooms' | 'contacts')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <tab.icon size={20} />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="communication-controls">
        <div className="search-container">
          <Search size={20} />
          <input
            type="text"
            placeholder="Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          Filtreler
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="filter-group">
              <label>Tür:</label>
              <select 
                value={filters.type} 
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">Tümü</option>
                <option value="direct">Direkt</option>
                <option value="group">Grup</option>
                <option value="broadcast">Yayın</option>
                <option value="announcement">Duyuru</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Öncelik:</label>
              <select 
                value={filters.priority} 
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">Tümü</option>
                <option value="low">Düşük</option>
                <option value="normal">Normal</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
            <div className="filter-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={filters.hasAttachments}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                />
                Dosya Eki Olanlar
              </label>
            </div>
            <div className="filter-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={filters.unreadOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, unreadOnly: e.target.checked }))}
                />
                Sadece Okunmamış
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="communication-content">
        {activeTab === 'messages' || activeTab === 'conversations' ? (
          <div className="messages-layout">
            {/* Conversations List */}
            <div className="conversations-sidebar">
              <div className="sidebar-header">
                <h3>Konuşmalar</h3>
                <button className="btn btn-icon" onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} />
                </button>
              </div>
              
              {loading ? (
                <div className="loading">Yükleniyor...</div>
              ) : (
                <div className="conversations-list">
                  {conversations.map(conversation => (
                    <motion.div
                      key={conversation.id}
                      className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                      onClick={() => handleConversationSelect(conversation)}
                      whileHover={{ backgroundColor: 'var(--hover-bg)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="conversation-avatar">
                        {conversation.type === 'direct' ? (
                          <div className="avatar">👤</div>
                        ) : (
                          <div className="avatar">👥</div>
                        )}
                      </div>
                      <div className="conversation-info">
                        <div className="conversation-title">
                          {conversation.title || `${conversation.participants.length} kişi`}
                        </div>
                        <div className="conversation-last-message">
                          {conversation.lastMessage ? (
                            <>
                              <span className="sender">{conversation.lastMessage.senderName}:</span>
                              <span className="message">{conversation.lastMessage.content}</span>
                            </>
                          ) : (
                            'Henüz mesaj yok'
                          )}
                        </div>
                      </div>
                      <div className="conversation-meta">
                        {conversation.unreadCount[conversation.id] > 0 && (
                          <span className="unread-badge">
                            {conversation.unreadCount[conversation.id]}
                          </span>
                        )}
                        <span className="time">
                          {conversation.lastMessage ? formatDate(conversation.lastMessage.timestamp) : ''}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {selectedConversation ? (
                <>
                  {/* Conversation Header */}
                  <div className="conversation-header">
                    <div className="conversation-info">
                      <h3>{selectedConversation.title || `${selectedConversation.participants.length} kişi`}</h3>
                      <p>{selectedConversation.description}</p>
                    </div>
                    <div className="conversation-actions">
                      <button className="btn btn-icon">
                        <Phone size={16} />
                      </button>
                      <button className="btn btn-icon">
                        <Video size={16} />
                      </button>
                      <button className="btn btn-icon">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div className="messages-list">
                    {messages.map(message => (
                      <motion.div
                        key={message.id}
                        className={`message ${message.senderId === 'current-user' ? 'own' : 'other'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="message-avatar">
                          <div className="avatar">{message.senderName.charAt(0)}</div>
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="sender-name">{message.senderName}</span>
                            <span className="message-time">{formatDate(message.createdAt)}</span>
                          </div>
                          
                          {message.replyTo && (
                            <div className="reply-to">
                              <span>Yanıtla:</span>
                              <span className="reply-content">{message.replyTo}</span>
                            </div>
                          )}

                          <div className="message-text">
                            {message.content}
                            {message.edited && <span className="edited">(düzenlendi)</span>}
                          </div>

                          {message.attachments && message.attachments.length > 0 && (
                            <div className="message-attachments">
                              {message.attachments.map((attachment, index) => (
                                <div key={index} className="attachment">
                                  {getFileIcon(attachment.mimeType)}
                                  <span className="attachment-name">{attachment.originalName}</span>
                                  <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                                  <button className="btn btn-icon">
                                    <Download size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {message.reactions.length > 0 && (
                            <div className="message-reactions">
                              {message.reactions.map((reaction, index) => (
                                <span key={index} className="reaction">
                                  {reaction.emoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="message-input">
                    <div className="input-actions">
                      <button 
                        className="btn btn-icon"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip size={16} />
                      </button>
                      <button className="btn btn-icon">
                        <Smile size={16} />
                      </button>
                    </div>
                    
                    <div className="input-container">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      
                      {selectedFiles.length > 0 && (
                        <div className="selected-files">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="selected-file">
                              <span>{file.name}</span>
                              <button 
                                className="btn btn-icon"
                                onClick={() => removeFile(index)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      className="btn btn-primary send-btn"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() && selectedFiles.length === 0}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-conversation">
                  <MessageSquare size={48} />
                  <h3>Bir konuşma seçin</h3>
                  <p>Mesajlaşmaya başlamak için sol panelden bir konuşma seçin</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="content-area">
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <div className="content-list">
                {/* Content based on active tab */}
                {activeTab === 'emails' && emails.map(email => (
                  <div key={email.id} className="email-item">
                    <div className="email-sender">{email.from.name}</div>
                    <div className="email-subject">{email.subject}</div>
                    <div className="email-preview">{email.content.substring(0, 100)}...</div>
                    <div className="email-time">{formatDate(email.createdAt)}</div>
                  </div>
                ))}

                {activeTab === 'chatrooms' && chatRooms.map(room => (
                  <div key={room.id} className="chatroom-item">
                    <div className="room-name">{room.name}</div>
                    <div className="room-description">{room.description}</div>
                    <div className="room-participants">{room.currentParticipants} katılımcı</div>
                    <div className="room-category">{room.category}</div>
                  </div>
                ))}

                {activeTab === 'contacts' && contacts.map(contact => (
                  <div key={contact.id} className="contact-item">
                    <div className="contact-avatar">
                      <div className="avatar">{contact.contactName.charAt(0)}</div>
                    </div>
                    <div className="contact-info">
                      <div className="contact-name">{contact.contactName}</div>
                      <div className="contact-role">{contact.contactRole}</div>
                      <div className="contact-status">{contact.status}</div>
                    </div>
                    <div className="contact-actions">
                      <button className="btn btn-icon">
                        <MessageSquare size={16} />
                      </button>
                      <button className="btn btn-icon">
                        <Phone size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />

      {/* Modals would go here */}
      {/* Create Conversation Modal */}
      {/* Create Email Modal */}
      {/* Create Chat Room Modal */}
      {/* Add Contact Modal */}
    </div>
  );
};

export default CommunicationPage;
