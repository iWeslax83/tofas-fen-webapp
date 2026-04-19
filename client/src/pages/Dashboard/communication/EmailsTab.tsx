import React from 'react';
import { Email } from './types';

interface EmailsTabProps {
  emails: Email[];
  loading: boolean;
  error: string | null;
  formatDate: (date: Date) => string;
}

const EmailsTab: React.FC<EmailsTabProps> = ({ emails, loading, error, formatDate }) => {
  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="content-list">
      {emails.map((email) => (
        <div key={email.id} className="email-item">
          <div className="email-sender">{email.from.name}</div>
          <div className="email-subject">{email.subject}</div>
          <div className="email-preview">{email.content.substring(0, 100)}...</div>
          <div className="email-time">{formatDate(email.createdAt)}</div>
        </div>
      ))}
    </div>
  );
};

export default EmailsTab;
