import React from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { LoadBar } from '../../../components/SkeletonComponents';
import { Chip } from '../../../components/ui/Chip';
import { ChatRoom } from './types';

interface ChatRoomsTabProps {
  chatRooms: ChatRoom[];
  loading: boolean;
  error: string | null;
}

const ChatRoomsTab: React.FC<ChatRoomsTabProps> = ({ chatRooms, loading, error }) => {
  if (loading)
    return (
      <div className="max-w-xs">
        <LoadBar />
      </div>
    );
  if (error) return <div className="font-serif text-sm text-[var(--accent)]">{error}</div>;
  if (chatRooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <MessageCircle size={32} className="text-[var(--ink-dim)]" />
        <p className="font-serif text-sm text-[var(--ink-2)]">Henüz sohbet odası yok.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {chatRooms.map((room) => (
        <div
          key={room.id}
          className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif text-base text-[var(--ink)]">{room.name}</span>
            <Chip tone="outline">{room.category}</Chip>
          </div>
          <p className="text-sm text-[var(--ink-2)] leading-relaxed">{room.description}</p>
          <div className="mt-auto flex items-center gap-1.5 text-xs text-[var(--ink-dim)]">
            <Users size={12} />
            {room.currentParticipants} katılımcı
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatRoomsTab;
