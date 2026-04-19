import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Trash2,
  Download,
  Image,
  Video as VideoIcon,
  Music,
  File,
} from 'lucide-react';
import { Message, Conversation } from './types';

interface MessagesTabProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  newMessage: string;
  selectedFiles: File[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onConversationSelect: (conversation: Conversation) => void;
  onNewMessage: (value: string) => void;
  onSendMessage: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onCreateClick: () => void;
  formatDate: (date: Date) => string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image size={16} />;
  if (mimeType.startsWith('video/')) return <VideoIcon size={16} />;
  if (mimeType.startsWith('audio/')) return <Music size={16} />;
  return <File size={16} />;
};

const MessagesTab: React.FC<MessagesTabProps> = ({
  conversations,
  selectedConversation,
  messages,
  loading,
  newMessage,
  selectedFiles,
  messagesEndRef,
  onConversationSelect,
  onNewMessage,
  onSendMessage,
  onFileSelect,
  onRemoveFile,
  onCreateClick,
  formatDate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="messages-layout">
      {/* Conversations List */}
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h3>Konuşmalar</h3>
          <button className="btn btn-icon" onClick={onCreateClick}>
            <Plus size={16} />
          </button>
        </div>

        {loading ? (
          <div className="loading">Yükleniyor...</div>
        ) : (
          <div className="conversations-list">
            {conversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                onClick={() => onConversationSelect(conversation)}
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
                <h3>
                  {selectedConversation.title || `${selectedConversation.participants.length} kişi`}
                </h3>
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
              {messages.map((message) => (
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
                            <span className="attachment-size">
                              {formatFileSize(attachment.size)}
                            </span>
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
                <button className="btn btn-icon" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip size={16} />
                </button>
                <button className="btn btn-icon">
                  <Smile size={16} />
                </button>
              </div>

              <div className="input-container">
                <textarea
                  value={newMessage}
                  onChange={(e) => onNewMessage(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                />

                {selectedFiles.length > 0 && (
                  <div className="selected-files">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="selected-file">
                        <span>{file.name}</span>
                        <button className="btn btn-icon" onClick={() => onRemoveFile(index)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary send-btn"
                onClick={onSendMessage}
                disabled={!newMessage.trim() && selectedFiles.length === 0}
              >
                <Send size={16} />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
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
  );
};

export default MessagesTab;
