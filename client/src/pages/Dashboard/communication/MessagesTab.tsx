import React, { useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Paperclip,
  Send,
  Trash2,
  Download,
  Image,
  Video as VideoIcon,
  Music,
  File as FileIcon,
} from 'lucide-react';
import { Portrait } from '../../../components/Portrait';
import { cn } from '../../../utils/cn';
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
  if (bytes === 0) return '0 Bayt';
  const k = 1024;
  const sizes = ['Bayt', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image size={16} />;
  if (mimeType.startsWith('video/')) return <VideoIcon size={16} />;
  if (mimeType.startsWith('audio/')) return <Music size={16} />;
  return <FileIcon size={16} />;
};

const iconButton =
  'inline-flex items-center justify-center h-8 w-8 border border-[var(--rule)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors disabled:opacity-40 disabled:hover:border-[var(--rule)]';

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
  const canSend = newMessage.trim().length > 0 || selectedFiles.length > 0;

  return (
    // The conversation list and the thread are two columns of one grid. They
    // used to be styled by .messages-layout / .conversations-sidebar, whose CSS
    // no longer exists, so both blocks collapsed into a single stacked column --
    // the page told you to "pick a conversation from the left panel" while
    // having no left panel.
    <div className="grid h-full grid-cols-1 md:grid-cols-[20rem_1fr] divide-x divide-[var(--rule)] overflow-hidden">
      <aside className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--rule)]">
          <h3 className="font-serif text-base text-[var(--ink)]">Konuşmalar</h3>
          <button type="button" className={iconButton} onClick={onCreateClick} title="Yeni konuşma">
            <Plus size={16} />
            <span className="sr-only">Yeni konuşma</span>
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-xs font-medium text-[var(--ink-dim)]">Yükleniyor…</p>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-6 font-serif text-sm text-[var(--ink-2)]">Henüz konuşma yok.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-[var(--rule)]">
            {conversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;
              const title = conversation.title || `${conversation.participants.length} kişi`;
              const unread = conversation.unreadCount[conversation.id] ?? 0;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onConversationSelect(conversation)}
                    aria-current={isActive || undefined}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                      isActive
                        ? 'bg-[var(--surface)] border-l-2 border-[var(--state)]'
                        : 'border-l-2 border-transparent hover:bg-[var(--surface-2)]',
                    )}
                  >
                    <Portrait name={title} size="sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-serif text-sm text-[var(--ink)] truncate">
                        {title}
                      </span>
                      <span className="block text-xs text-[var(--ink-dim)] truncate">
                        {conversation.lastMessage
                          ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.content}`
                          : 'Henüz mesaj yok'}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      {conversation.lastMessage && (
                        <span className="text-xs text-[var(--ink-dim)] whitespace-nowrap">
                          {formatDate(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                      {unread > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 bg-[var(--state)] text-white text-[10px] font-semibold">
                          {unread}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            <header className="px-6 py-3 border-b border-[var(--rule)]">
              <h3 className="font-serif text-base text-[var(--ink)]">
                {selectedConversation.title || `${selectedConversation.participants.length} kişi`}
              </h3>
              {selectedConversation.description && (
                <p className="text-xs text-[var(--ink-dim)]">{selectedConversation.description}</p>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <p className="font-serif text-sm text-[var(--ink-2)]">
                  Bu konuşmada henüz mesaj yok.
                </p>
              )}

              {messages.map((message) => (
                <article key={message.id} className="flex gap-3">
                  <Portrait name={message.senderName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-sm text-[var(--ink)]">
                        {message.senderName}
                      </span>
                      <span className="text-xs text-[var(--ink-dim)]">
                        {formatDate(message.createdAt)}
                      </span>
                      {message.edited && (
                        <span className="text-xs text-[var(--ink-dim)]">(düzenlendi)</span>
                      )}
                    </div>

                    {message.replyTo && (
                      <p className="mt-1 border-l-2 border-[var(--rule)] pl-2 text-xs text-[var(--ink-dim)] truncate">
                        {message.replyTo}
                      </p>
                    )}

                    <p className="mt-1 font-serif text-sm leading-relaxed text-[var(--ink-2)] whitespace-pre-wrap break-words">
                      {message.content}
                    </p>

                    {message.attachments && message.attachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 border border-[var(--rule)] px-2 py-1 text-xs text-[var(--ink-2)]"
                          >
                            {getFileIcon(attachment.mimeType)}
                            <span className="flex-1 truncate">{attachment.originalName}</span>
                            <span className="text-[var(--ink-dim)] shrink-0">
                              {formatFileSize(attachment.size)}
                            </span>
                            <button
                              type="button"
                              className="text-[var(--ink-dim)] hover:text-[var(--state)] transition-colors"
                              title="İndir"
                            >
                              <Download size={12} />
                              <span className="sr-only">İndir</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {message.reactions.length > 0 && (
                      <p className="mt-1 flex gap-1 text-sm">
                        {message.reactions.map((reaction, index) => (
                          <span key={index}>{reaction.emoji}</span>
                        ))}
                      </p>
                    )}
                  </div>
                </article>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-[var(--rule)] px-6 py-3">
              {selectedFiles.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 border border-[var(--rule)] px-2 py-1 text-xs text-[var(--ink-2)]"
                    >
                      <span className="flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveFile(index)}
                        className="text-[var(--ink-dim)] hover:text-[var(--state)] transition-colors"
                        title="Kaldır"
                      >
                        <Trash2 size={12} />
                        <span className="sr-only">Kaldır</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => fileInputRef.current?.click()}
                  title="Dosya ekle"
                >
                  <Paperclip size={16} />
                  <span className="sr-only">Dosya ekle</span>
                </button>

                <textarea
                  value={newMessage}
                  onChange={(e) => onNewMessage(e.target.value)}
                  placeholder="Mesajınızı yazın…"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                  className="flex-1 resize-none border border-[var(--rule)] bg-transparent px-3 py-2 font-serif text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-dim)] focus:outline-none focus:border-[var(--ink)]"
                />

                <button
                  type="button"
                  onClick={onSendMessage}
                  disabled={!canSend}
                  className="inline-flex items-center justify-center h-8 w-8 bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--state)] transition-colors disabled:opacity-40 disabled:hover:bg-[var(--ink)]"
                  title="Gönder"
                >
                  <Send size={16} />
                  <span className="sr-only">Gönder</span>
                </button>
              </div>
            </footer>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
            <MessageSquare size={32} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Bir konuşma seçin</h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Mesajlaşmaya başlamak için soldaki listeden bir konuşma seçin.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default MessagesTab;
