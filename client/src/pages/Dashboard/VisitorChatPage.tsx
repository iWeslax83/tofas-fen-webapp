import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { apiClient } from '../../utils/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../stores/uiStore';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const { theme } = useTheme();
  const isAdmin = user?.rol === 'admin';

  // Resolve effective theme (system -> actual)
  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  // Theme-aware colors
  const colors = useMemo(
    () =>
      isDark
        ? {
            bg: '#111827',
            card: '#1f2937',
            cardHover: '#374151',
            border: '#374151',
            borderLight: '#4b5563',
            text: '#f9fafb',
            textSecondary: '#d1d5db',
            textMuted: '#9ca3af',
            input: '#374151',
            inputBorder: '#4b5563',
            myBubble: '#0f766e',
            myBubbleText: '#fff',
            otherBubble: '#374151',
            otherBubbleText: '#f3f4f6',
            activeConv: '#1e3a5f',
            placeholder: '#6b7280',
            sendBtn: '#0f766e',
            sendBtnDisabled: '#374151',
            sendBtnTextDisabled: '#6b7280',
          }
        : {
            bg: '#f8fafc',
            card: '#ffffff',
            cardHover: '#f1f5f9',
            border: '#e2e8f0',
            borderLight: '#f1f5f9',
            text: '#0f172a',
            textSecondary: '#374151',
            textMuted: '#9ca3af',
            input: '#ffffff',
            inputBorder: '#e5e7eb',
            myBubble: '#0f766e',
            myBubbleText: '#fff',
            otherBubble: '#f1f5f9',
            otherBubbleText: '#1f2937',
            activeConv: '#eff6ff',
            placeholder: '#9ca3af',
            sendBtn: '#0f766e',
            sendBtnDisabled: '#e5e7eb',
            sendBtnTextDisabled: '#9ca3af',
          },
    [isDark],
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
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

  // For visitors: auto-create/get conversation
  // For admins: list all visitor conversations
  const initChat = useCallback(async () => {
    try {
      if (isAdmin) {
        const res = await apiClient.get('/api/visitor-chat/conversations');
        const convs = (res.data as Conversation[]) || [];
        setConversations(convs);
        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationId(convs[0].id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const res = await apiClient.get(`/api/visitor-chat/messages/${activeConversationId}`);
      setMessages((res.data as { messages?: ChatMessage[] }).messages || []);
    } catch {
      // error
    }
  }, [activeConversationId]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages();
      // Poll every 5 seconds for new messages
      pollRef.current = setInterval(fetchMessages, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
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

  return (
    <ModernDashboardLayout pageTitle={isAdmin ? 'Ziyaretçi Sohbetleri' : 'Yönetici ile Sohbet'}>
      <div
        style={{
          padding: '24px',
          maxWidth: 1000,
          margin: '0 auto',
          height: 'calc(100vh - 160px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            color: colors.text,
          }}
        >
          <MessageCircle size={28} />
          <h1 style={{ margin: 0, fontSize: 24 }}>
            {isAdmin ? 'Ziyaretçi Sohbetleri' : 'Yönetici ile Sohbet'}
          </h1>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          {/* Conversation List (admin only) */}
          {isAdmin && (
            <div
              style={{
                width: 260,
                background: colors.card,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                overflow: 'auto',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.border}`,
                  fontWeight: 600,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                Sohbetler ({conversations.length})
              </div>
              {conversations.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    color: colors.textMuted,
                    fontSize: 13,
                  }}
                >
                  Henüz sohbet yok
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      border: 'none',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${colors.borderLight}`,
                      background:
                        activeConversationId === conv.id ? colors.activeConv : colors.card,
                      color: colors.text,
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>
                      {conv.title}
                    </div>
                    {conv.lastMessage && (
                      <div
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.lastMessage.senderName}: {conv.lastMessage.content}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Chat Area */}
          <div
            style={{
              flex: 1,
              background: colors.card,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {loading ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textMuted,
                }}
              >
                Yükleniyor...
              </div>
            ) : !activeConversationId ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textMuted,
                }}
              >
                Bir sohbet seçin
              </div>
            ) : (
              <>
                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {messages.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.textMuted,
                        fontSize: 14,
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <MessageCircle size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
                        <p>Henüz mesaj yok. Bir soru sorun!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg._id || msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '70%',
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: isMe ? colors.myBubble : colors.otherBubble,
                              color: isMe ? colors.myBubbleText : colors.otherBubbleText,
                            }}
                          >
                            {!isMe && (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  marginBottom: 2,
                                  color: colors.textMuted,
                                }}
                              >
                                {msg.senderName} (
                                {msg.senderRole === 'admin' ? 'Yönetici' : 'Ziyaretçi'})
                              </div>
                            )}
                            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                marginTop: 4,
                                opacity: 0.7,
                                textAlign: 'right',
                              }}
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

                {/* Input */}
                <div
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesajınızı yazın..."
                    rows={1}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${colors.inputBorder}`,
                      fontSize: 14,
                      resize: 'none',
                      outline: 'none',
                      lineHeight: 1.5,
                      background: colors.input,
                      color: colors.text,
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: newMessage.trim() ? colors.sendBtn : colors.sendBtnDisabled,
                      color: newMessage.trim() ? '#fff' : colors.sendBtnTextDisabled,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
