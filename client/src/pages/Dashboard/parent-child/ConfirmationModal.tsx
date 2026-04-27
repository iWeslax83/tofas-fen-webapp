import { AlertTriangle } from 'lucide-react';
import type { ConfirmAction } from './types';

interface ConfirmationModalProps {
  confirmAction: ConfirmAction;
  processing: boolean;
  onConfirm: (parentId: string, childId: string) => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  confirmAction,
  processing,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <div
      className="ve-confirm-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Onay penceresi"
    >
      <div className="ve-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ve-confirm-icon">
          <AlertTriangle size={24} />
        </div>
        <h3 className="ve-confirm-title">Bağlantıyı Kaldır</h3>
        <p className="ve-confirm-text">
          <strong>{confirmAction.parentName}</strong> ile <strong>{confirmAction.childName}</strong>{' '}
          arasındaki bağlantı kaldırılacak. Devam etmek istiyor musunuz?
        </p>
        <div className="ve-confirm-actions">
          <button className="ve-confirm-cancel" onClick={onCancel} disabled={processing}>
            İptal
          </button>
          <button
            className="ve-confirm-danger"
            onClick={() => onConfirm(confirmAction.parentId, confirmAction.childId)}
            disabled={processing}
          >
            {processing ? 'Kaldırılıyor...' : 'Evet, Kaldır'}
          </button>
        </div>
      </div>
    </div>
  );
}
