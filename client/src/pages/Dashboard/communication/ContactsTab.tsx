import React from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { Contact } from './types';

interface ContactsTabProps {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ contacts, loading, error }) => {
  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="content-list">
      {contacts.map((contact) => (
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
  );
};

export default ContactsTab;
