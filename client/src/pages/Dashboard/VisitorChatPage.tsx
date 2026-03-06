import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { apiClient } from '../../utils/api';
import { useAuthContext } from '../../contexts/AuthContext';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';

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
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      // error
    } finally {
      setLoading(false);
    }
  }, [isAdmin, activeConversationId]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const res = await apiClient.get(`/api/visitor-chat/messages/${activeConversationId}`);
      setMessages((res.data as any).messages || []);
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
        content: newMessage.trim()
      });
      setNewMessage('');
      await fetchMessages();
    } catch {
      // error
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
    <ModernDashboardLayout pageTitle={isAdmin ? 'Ziyaretci Sohbetleri' : 'Yonetici ile Sohbet'}>
      <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <MessageCircle size={28} />
          <h1 style={{ margin: 0, fontSize: 24 }}>{isAdmin ? 'Ziyaretci Sohbetleri' : 'Yonetici ile Sohbet'}</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          {/* Conversation List (admin only) */}
          {isAdmin && (
            <div style={{
              width: 260, background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9',
              overflow: 'auto', flexShrink: 0
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 14, color: '#374151' }}>
                Sohbetler ({conversations.length})
              </div>
              {conversations.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Henuz sohbet yok
                </div>
              ) : (
                conversations.map(conv => (
                  <button key={conv.id} onClick={() => setActiveConversationId(conv.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none',
                      cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                      background: activeConversationId === conv.id ? '#eff6ff' : '#fff'
                    }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{conv.title}</div>
                    {conv.lastMessage && (
                      <div style={{ color: '#9ca3af', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.lastMessage.senderName}: {conv.lastMessage.content}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Chat Area */}
          <div style={{
            flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9',
            display: 'flex', flexDirection: 'column', minHeight: 0
          }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Yukleniyor...
              </div>
            ) : !activeConversationId ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Bir sohbet secin
              </div>
            ) : (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
                      <div style={{ textAlign: 'center' }}>
                        <MessageCircle size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
                        <p>Henuz mesaj yok. Bir soru sorun!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg._id || msg.id} style={{
                          display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start'
                        }}>
                          <div style={{
                            maxWidth: '70%', padding: '10px 14px', borderRadius: 12,
                            background: isMe ? '#3b82f6' : '#f1f5f9',
                            color: isMe ? '#fff' : '#1f2937'
                          }}>
                            {!isMe && (
                              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, color: isMe ? '#dbeafe' : '#6b7280' }}>
                                {msg.senderName} ({msg.senderRole === 'admin' ? 'Yonetici' : 'Ziyaretci'})
                              </div>
                            )}
                            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>
                              {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesajinizi yazin..."
                    rows={1}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                      fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5
                    }}
                  />
                  <button onClick={sendMessage} disabled={!newMessage.trim() || sending}
                    style={{
                      padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: newMessage.trim() ? '#3b82f6' : '#e5e7eb',
                      color: newMessage.trim() ? '#fff' : '#9ca3af',
                      display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 14
                    }}>
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
