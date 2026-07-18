import { useRef, useId } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from './Button';

export interface FilePickerButtonProps {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  accept?: string;
  /** Shown next to the button when no file is chosen yet, e.g. accepted formats. */
  hint?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Devlet file picker — hides the native input (which renders as an
 * unstyled, English "Choose File / No file chosen" control in every
 * browser) behind a themed Button, and shows the picked filename in its
 * place. The same hidden-input-plus-trigger pattern the Not İçe Aktarma
 * page already used, now shared so upload forms don't each re-style their
 * own native input as a half-measure.
 */
export function FilePickerButton({
  file,
  onFileSelected,
  accept,
  hint,
  label = 'Dosya Seç',
  disabled,
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
        className="sr-only"
        aria-label={label}
        disabled={disabled}
      />
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <FileSpreadsheet size={14} />
        {label}
      </Button>
      {file ? (
        <span className="font-mono text-xs text-[var(--ink-2)]">{file.name}</span>
      ) : (
        hint && <span className="font-mono text-[10px] text-[var(--ink-dim)]">{hint}</span>
      )}
    </div>
  );
}
