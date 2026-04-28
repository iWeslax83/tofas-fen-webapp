import { AlertTriangle, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Onay penceresi"
    >
      <Card className="relative w-full max-w-md" contentClassName="p-0">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] flex items-center gap-2">
              <AlertTriangle size={12} />
              Bağlantıyı Kaldır
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
              <strong className="text-[var(--ink)]">{confirmAction.parentName}</strong> ile{' '}
              <strong className="text-[var(--ink)]">{confirmAction.childName}</strong> arasındaki
              bağlantı kaldırılacak. Devam etmek istiyor musunuz?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={processing}>
                İptal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onConfirm(confirmAction.parentId, confirmAction.childId)}
                loading={processing}
              >
                Evet, Kaldır
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
