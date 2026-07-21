import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogBody, DialogFooter } from './Dialog';
import { Button } from './Button';
import './ConfirmDialog.css';

export interface ConfirmOptions {
  title?: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized = typeof opts === 'string' ? { description: opts } : opts;
    setOptions(normalized);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const isDanger = options?.variant === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => !next && settle(false)}
        size="sm"
        showCloseButton={false}
      >
        <DialogContent>
          <DialogBody className="confirm-dialog-body">
            <span className={`confirm-dialog-icon ${isDanger ? 'confirm-dialog-icon-danger' : ''}`}>
              {isDanger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
            </span>
            <div className="confirm-dialog-text">
              {options?.title && <p className="confirm-dialog-title">{options.title}</p>}
              <p className="confirm-dialog-description">{options?.description}</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => settle(false)}>
              {options?.cancelLabel ?? 'Vazgeç'}
            </Button>
            <Button variant={isDanger ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {options?.confirmLabel ?? 'Onayla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
