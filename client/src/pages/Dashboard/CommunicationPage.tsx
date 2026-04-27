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
} from 'lucide-react';
import { SecureAPI } from '../../utils/api';
import { MessagesTab, EmailsTab, ChatRoomsTab, ContactsTab } from './communication';
import type {
  Message,
  Conversation,
  Email,
  ChatRoom,
  Contact,
  ActiveTab,
  Filters,
} from './communication';
import './CommunicationPage.css';

const CommunicationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
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
  const [, setTotalPages] = useState(1);
  const [, setShowCreateModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [page] = useState(1);
  const [sortBy] = useState<'date' | 'name' | 'unread'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Filters>({
    type: '',
    category: '',
    status: '',
    priority: '',
    hasAttachments: false,
    unreadOnly: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'messages':
        case 'conversations': {
          const conversationsData = await SecureAPI.get('/api/communication/conversations', {
            params: { ...filters, sortBy, sortOrder, page },
          });
          setConversations((conversationsData as { data: Conversation[] }).data);
          setTotalPages(Math.ceil((conversationsData as { total: number }).total / 20));
          break;
        }

        case 'emails': {
          const emailsData = await SecureAPI.get('/api/communication/emails', {
            params: { page, ...filters, type: 'received' },
          });
          setEmails((emailsData as { data: Email[] }).data);
          setTotalPages(Math.ceil((emailsData as { total: number }).total / 20));
          break;
        }

        case 'chatrooms': {
          const chatRoomsData = await SecureAPI.get('/api/communication/chatrooms', {
            params: { ...filters, page },
          });
          setChatRooms((chatRoomsData as { data: ChatRoom[] }).data);
          setTotalPages(Math.ceil((chatRoomsData as { total: number }).total / 20));
          break;
        }

        case 'contacts': {
          const contactsData = await SecureAPI.get('/api/communication/contacts', {
            params: { ...filters, page },
          });
          setContacts((contactsData as { data: Contact[] }).data);
          setTotalPages(Math.ceil((contactsData as { total: number }).total / 20));
          break;
        }
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Veri yüklenirken hata oluştu',
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, sortBy, sortOrder, filters]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await SecureAPI.get(`/api/communication/messages/${conversationId}`, {
        params: { page: 1, limit: 50 },
      });
      setMessages((response as { data: { messages: Message[] } }).data.messages);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Mesajlar yüklenirken hata oluştu',
      );
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!selectedConversation) return;

    try {
      const messageData: {
        conversationId: string;
        content: string;
        attachments?: File[];
        contentType?: string;
      } = {
        conversationId: selectedConversation.id,
        content: newMessage,
        contentType: 'text',
      };

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('attachments', file);
        });

        const uploadResponse = await SecureAPI.post('/api/communication/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        messageData.attachments = (uploadResponse as { data: { files: File[] } }).data.files;
        messageData.contentType = 'file';
      }

      await SecureAPI.post('/api/communication/messages', messageData);

      setNewMessage('');
      setSelectedFiles([]);
      fetchMessages(selectedConversation.id);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Mesaj gönderilirken hata oluştu',
      );
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  // Handle file removal
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }

    try {
      const response = await SecureAPI.get('/api/communication/search', {
        params: { q: searchQuery, ...filters },
      });

      if (activeTab === 'messages') {
        setMessages((response as { data: Message[] }).data);
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Arama yapılırken hata oluştu',
      );
    }
  }, [searchQuery, filters, activeTab, fetchData]);

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  // Format date
  const formatDate = (date: Date): string => {
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const tabs = [
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare },
    { id: 'conversations', label: 'Konuşmalar', icon: Users },
    { id: 'emails', label: 'E-posta', icon: Mail },
    { id: 'chatrooms', label: 'Sohbet Odaları', icon: MessageCircle },
    { id: 'contacts', label: 'Kişiler', icon: UserPlus },
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
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Yeni{' '}
            {activeTab === 'messages'
              ? 'Mesaj'
              : activeTab === 'emails'
                ? 'E-posta'
                : activeTab === 'chatrooms'
                  ? 'Sohbet Odası'
                  : 'Kişi'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="communication-tabs">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
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
        <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}>
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
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
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
                onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
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
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, hasAttachments: e.target.checked }))
                  }
                />
                Dosya Eki Olanlar
              </label>
            </div>
            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.unreadOnly}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, unreadOnly: e.target.checked }))
                  }
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
          <MessagesTab
            conversations={conversations}
            selectedConversation={selectedConversation}
            messages={messages}
            loading={loading}
            newMessage={newMessage}
            selectedFiles={selectedFiles}
            messagesEndRef={messagesEndRef}
            onConversationSelect={handleConversationSelect}
            onNewMessage={setNewMessage}
            onSendMessage={sendMessage}
            onFileSelect={handleFileSelect}
            onRemoveFile={removeFile}
            onCreateClick={() => setShowCreateModal(true)}
            formatDate={formatDate}
          />
        ) : (
          <div className="content-area">
            {activeTab === 'emails' && (
              <EmailsTab emails={emails} loading={loading} error={error} formatDate={formatDate} />
            )}
            {activeTab === 'chatrooms' && (
              <ChatRoomsTab chatRooms={chatRooms} loading={loading} error={error} />
            )}
            {activeTab === 'contacts' && (
              <ContactsTab contacts={contacts} loading={loading} error={error} />
            )}
          </div>
        )}
      </div>

      {/* Modals would go here */}
      {/* Create Conversation Modal */}
      {/* Create Email Modal */}
      {/* Create Chat Room Modal */}
      {/* Add Contact Modal */}
    </div>
  );
};

export default CommunicationPage;
