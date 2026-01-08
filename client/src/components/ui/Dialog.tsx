import React, { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import './Dialog.css';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export interface DialogBodyProps {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}

export interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

// Dialog Root Component
export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, closeOnEscape, onOpenChange]);

  useEffect(() => {
    if (open && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [open]);

  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="dialog-overlay" onClick={() => closeOnOverlayClick && onOpenChange(false)}>
          <motion.div
            ref={dialogRef}
            className={`dialog dialog-${size} ${className}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            {showCloseButton && (
              <button
                type="button"
                className="dialog-close"
                onClick={() => onOpenChange(false)}
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Dialog Content Component
export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className = '',
}) => {
  return <div className={`dialog-content ${className}`}>{children}</div>;
};

// Dialog Header Component
export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  className = '',
}) => {
  return <div className={`dialog-header ${className}`}>{children}</div>;
};

// Dialog Title Component
export const DialogTitle: React.FC<DialogTitleProps> = ({
  children,
  className = '',
}) => {
  return (
    <h2 id="dialog-title" className={`dialog-title ${className}`}>
      {children}
    </h2>
  );
};

// Dialog Description Component
export const DialogDescription: React.FC<DialogDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <p id="dialog-description" className={`dialog-description ${className}`}>
      {children}
    </p>
  );
};

// Dialog Body Component
export const DialogBody: React.FC<DialogBodyProps> = ({
  children,
  className = '',
  scrollable = true,
}) => {
  return (
    <div className={`dialog-body ${scrollable ? 'dialog-body-scrollable' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Dialog Footer Component
export const DialogFooter: React.FC<DialogFooterProps> = ({
  children,
  className = '',
}) => {
  return <div className={`dialog-footer ${className}`}>{children}</div>;
};

// Export all components
export default {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};

