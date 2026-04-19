import React from 'react';
import { ChatRoom } from './types';

interface ChatRoomsTabProps {
  chatRooms: ChatRoom[];
  loading: boolean;
  error: string | null;
}

const ChatRoomsTab: React.FC<ChatRoomsTabProps> = ({ chatRooms, loading, error }) => {
  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="content-list">
      {chatRooms.map((room) => (
        <div key={room.id} className="chatroom-item">
          <div className="room-name">{room.name}</div>
          <div className="room-description">{room.description}</div>
          <div className="room-participants">{room.currentParticipants} katılımcı</div>
          <div className="room-category">{room.category}</div>
        </div>
      ))}
    </div>
  );
};

export default ChatRoomsTab;
