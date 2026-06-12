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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
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
import { cn } from '../../utils/cn';

const VALID_CONVERSATION_TYPES = ['direct', 'group', 'broadcast', 'announcement'] as const;
type ConversationType = (typeof VALID_CONVERSATION_TYPES)[number];

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
          // JOB A FIX: Only send params the /conversations route accepts.
          // The route validates query('type').optional().isIn([...]) — an empty
          // string passes the field as present and fails the isIn check, causing
          // the 400. Strip it when unset. Also omit client-only filter keys
          // (category, status, priority, hasAttachments, unreadOnly, sortBy,
          // sortOrder) that are not accepted by the server route.
          const conversationParams: Record<string, string | number> = { page };
          if (
            filters.type &&
            (VALID_CONVERSATION_TYPES as readonly string[]).includes(filters.type)
          ) {
            conversationParams['type'] = filters.type;
          }
          const conversationsData = await SecureAPI.get('/api/communication/conversations', {
            params: conversationParams,
          });
          // Server returns the array directly via res.json(conversations).
          // SecureAPI returns the full axios response, so .data is the body.
          const body = (conversationsData as { data: unknown }).data;
          if (Array.isArray(body)) {
            setConversations(body as Conversation[]);
            setTotalPages(Math.ceil((body as Conversation[]).length / 20));
          } else {
            const typed = body as { data: Conversation[]; total: number };
            setConversations(typed.data ?? []);
            setTotalPages(Math.ceil((typed.total ?? 0) / 20));
          }
          break;
        }

        case 'emails': {
          const emailsData = await SecureAPI.get('/api/communication/emails', {
            params: { page, type: 'received' },
          });
          setEmails((emailsData as { data: Email[] }).data);
          setTotalPages(Math.ceil((emailsData as { total: number }).total / 20));
          break;
        }

        case 'chatrooms': {
          const chatRoomsData = await SecureAPI.get('/api/communication/chatrooms', {
            params: { page },
          });
          setChatRooms((chatRoomsData as { data: ChatRoom[] }).data);
          setTotalPages(Math.ceil((chatRoomsData as { total: number }).total / 20));
          break;
        }

        case 'contacts': {
          const contactsData = await SecureAPI.get('/api/communication/contacts', {
            params: { page },
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
        params: { q: searchQuery },
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
  }, [searchQuery, activeTab, fetchData]);

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

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare },
    { id: 'conversations', label: 'Konuşmalar', icon: Users },
    { id: 'emails', label: 'E-posta', icon: Mail },
    { id: 'chatrooms', label: 'Sohbet Odaları', icon: MessageCircle },
    { id: 'contacts', label: 'Kişiler', icon: UserPlus },
  ];

  const newItemLabel =
    activeTab === 'messages'
      ? 'Mesaj'
      : activeTab === 'emails'
        ? 'E-posta'
        : activeTab === 'chatrooms'
          ? 'Sohbet Odası'
          : 'Kişi';

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'İletişim' }];

  return (
    <ModernDashboardLayout pageTitle="İletişim" breadcrumb={breadcrumb}>
      <div className="flex flex-col h-full">
        {/* Document header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--rule)] bg-[var(--paper)]">
          <header>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/İL
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">İletişim</h1>
          </header>

          {/* Actions row */}
          <div className="flex items-center justify-between mt-4">
            {/* Tabs */}
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap',
                      active
                        ? 'border-[var(--state)] text-[var(--ink)] bg-[var(--surface)]'
                        : 'border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--rule-2)]',
                    )}
                    aria-pressed={active}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="ml-4 shrink-0"
            >
              <Plus size={14} />
              Yeni {newItemLabel}
            </Button>
          </div>
        </div>

        {/* Search and Filters bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--rule)] bg-[var(--paper)]">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search size={14} className="text-[var(--ink-dim)] shrink-0" />
            <Input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} />
            Filtreler
          </Button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="flex flex-wrap gap-4 px-6 py-3 border-b border-[var(--rule)] bg-[var(--surface)]"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Tür:
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                  className="bg-transparent border-0 border-b border-[var(--rule)] px-1 py-1 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--state)]"
                >
                  <option value="">Tümü</option>
                  <option value="direct">Direkt</option>
                  <option value="group">Grup</option>
                  <option value="broadcast">Yayın</option>
                  <option value="announcement">Duyuru</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Öncelik:
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
                  className="bg-transparent border-0 border-b border-[var(--rule)] px-1 py-1 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--state)]"
                >
                  <option value="">Tümü</option>
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasAttachments}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, hasAttachments: e.target.checked }))
                  }
                  className="accent-[var(--state)]"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Dosya Eki Olanlar
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.unreadOnly}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, unreadOnly: e.target.checked }))
                  }
                  className="accent-[var(--state)]"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Sadece Okunmamış
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-2 border border-[var(--state)] bg-[var(--surface)] font-mono text-xs text-[var(--state)]">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
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
            <div className="h-full overflow-y-auto px-6 py-4">
              {activeTab === 'emails' && (
                <EmailsTab
                  emails={emails}
                  loading={loading}
                  error={error}
                  formatDate={formatDate}
                />
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
      </div>
    </ModernDashboardLayout>
  );
};

export default CommunicationPage;
