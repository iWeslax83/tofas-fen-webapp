import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { apiClient } from '../../utils/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

interface ChatMessage {
  _id: string;
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: string;
  };
}

export default function VisitorChatPage() {
  const { user } = useAuthContext();
  const isAdmin = user?.rol === 'admin';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = () => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  const initChat = useCallback(async () => {
    try {
      if (isAdmin) {
        const res = await apiClient.get('/api/visitor-chat/conversations');
        const convs = (res.data as Conversation[]) || [];
        setConversations(convs);
        if (convs.length > 0) {
          setActiveConversationId((curr) => curr ?? convs[0].id);
        }
      } else {
        const res = await apiClient.post('/api/visitor-chat/conversation');
        const conv = res.data as Conversation;
        setConversations([conv]);
        setActiveConversationId(conv.id);
      }
    } catch {
      toast.error('Sohbet yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const res = await apiClient.get(`/api/visitor-chat/messages/${activeConversationId}`);
      setMessages((res.data as { messages?: ChatMessage[] }).messages || []);
    } catch {
      // silent — polled periodically
    }
  }, [activeConversationId]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    if (!activeConversationId) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConversationId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || sending) return;
    setSending(true);
    try {
      await apiClient.post('/api/visitor-chat/messages', {
        conversationId: activeConversationId,
        content: newMessage.trim(),
      });
      setNewMessage('');
      await fetchMessages();
    } catch {
      toast.error('Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const pageTitle = isAdmin ? 'Ziyaretçi Sohbetleri' : 'Yönetici ile Sohbet';

  return (
    <ModernDashboardLayout pageTitle={pageTitle}>
      <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-160px)] flex flex-col">
        <header className="mb-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/Z-S
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1 flex items-center gap-2">
            <MessageCircle size={20} className="text-[var(--ink-dim)]" />
            {pageTitle}
          </h1>
        </header>

        <div className="flex-1 flex gap-4 min-h-0">
          {isAdmin && (
            <Card
              className="w-64 shrink-0 flex flex-col"
              contentClassName="p-0 flex flex-col h-full"
            >
              <div className="border-b border-[var(--rule)] px-4 py-2 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                  Sohbetler
                </span>
                <span className="font-serif text-xs text-[var(--ink-2)] ml-auto">
                  {conversations.length}
                </span>
              </div>
              {conversations.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-4 py-6 font-serif text-sm text-[var(--ink-dim)] text-center">
                  Henüz sohbet yok
                </div>
              ) : (
                <ul className="flex-1 overflow-auto divide-y divide-[var(--rule)]">
                  {conversations.map((conv) => {
                    const active = activeConversationId === conv.id;
                    return (
                      <li key={conv.id}>
                        <button
                          type="button"
                          onClick={() => setActiveConversationId(conv.id)}
                          className={cn(
                            'w-full text-left px-4 py-3 transition-colors',
                            active
                              ? 'bg-[var(--surface-2)]'
                              : 'bg-transparent hover:bg-[var(--surface)]',
                          )}
                          aria-pressed={active}
                        >
                          <div className="font-serif text-sm text-[var(--ink)] truncate">
                            {conv.title}
                          </div>
                          {conv.lastMessage && (
                            <div className="font-mono text-[10px] text-[var(--ink-dim)] truncate mt-0.5">
                              {conv.lastMessage.senderName}: {conv.lastMessage.content}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          <Card
            className="flex-1 flex flex-col min-w-0"
            contentClassName="p-0 flex flex-col h-full"
          >
            {loading ? (
              <div className="flex-1 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                Yükleniyor…
              </div>
            ) : !activeConversationId ? (
              <div className="flex-1 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                Bir sohbet seçin
              </div>
            ) : (
              <>
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-auto p-4 space-y-2"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--ink-dim)]">
                      <MessageCircle size={32} />
                      <p className="font-serif text-sm">Henüz mesaj yok. Bir soru sorun.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg._id || msg.id}
                          className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[70%] px-3 py-2 border',
                              isMe
                                ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                                : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--rule)]',
                            )}
                          >
                            {!isMe && (
                              <div
                                className={cn(
                                  'font-mono text-[10px] uppercase tracking-wider mb-1',
                                  'text-[var(--ink-dim)]',
                                )}
                              >
                                {msg.senderName} ·{' '}
                                {msg.senderRole === 'admin' ? 'Yönetici' : 'Ziyaretçi'}
                              </div>
                            )}
                            <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </div>
                            <div
                              className={cn(
                                'font-mono text-[10px] mt-1 text-right',
                                isMe ? 'text-white/60' : 'text-[var(--ink-dim)]',
                              )}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-[var(--rule)] p-3 flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesajınızı yazın…"
                    rows={1}
                    className={cn(
                      'flex-1 bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
                      'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
                      'focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
                      'transition-colors resize-none',
                    )}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    loading={sending}
                    aria-label="Mesaj gönder"
                  >
                    <Send size={14} />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
