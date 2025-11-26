/**
 * Feedback Form Component
 * Submit user feedback and bug reports
 */

import React, { useState } from 'react';
import { analytics } from '../utils/analytics';
import './FeedbackForm.css';

interface FeedbackFormProps {
  onClose?: () => void;
  defaultType?: 'bug' | 'feature' | 'improvement' | 'other';
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ onClose, defaultType = 'other' }) => {
  const [type, setType] = useState<string>(defaultType);
  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await analytics.submitFeedback({
        type: type as 'bug' | 'feature' | 'improvement' | 'other',
        category,
        title,
        description,
        priority,
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      });

      if (result.success) {
        setSuccess(true);
        // Track feedback submission
        await analytics.trackAction('feedback_submitted', { type, category });
        
        // Reset form
        setTimeout(() => {
          setType(defaultType);
          setCategory('');
          setTitle('');
          setDescription('');
          setPriority('medium');
          setSuccess(false);
          onClose?.();
        }, 2000);
      } else {
        setError(result.error || 'Feedback gönderilemedi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="feedback-form success">
        <div className="feedback-success-icon">✓</div>
        <h3>Teşekkürler!</h3>
        <p>Geri bildiriminiz başarıyla gönderildi.</p>
      </div>
    );
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <h3>Geri Bildirim Gönder</h3>

      <div className="form-group">
        <label htmlFor="type">Tür</label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
        >
          <option value="bug">Hata Bildirimi</option>
          <option value="feature">Özellik Önerisi</option>
          <option value="improvement">İyileştirme Önerisi</option>
          <option value="other">Diğer</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="category">Kategori</label>
        <input
          id="category"
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Örn: Giriş, Dashboard, Ödevler"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="title">Başlık</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kısa bir başlık"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Açıklama</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detaylı açıklama..."
          rows={5}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="priority">Öncelik</label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
        >
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
        </select>
      </div>

      {error && <div className="feedback-error">{error}</div>}

      <div className="form-actions">
        {onClose && (
          <button type="button" onClick={onClose} className="btn-secondary">
            İptal
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </div>
    </form>
  );
};

