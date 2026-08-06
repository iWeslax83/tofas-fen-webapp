import { scorePassword, type StrengthLevel } from '../../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
  userHints?: string[];
}

const SEGMENT_COLOR: Record<StrengthLevel, string> = {
  0: 'var(--accent)',
  1: 'var(--accent)',
  2: 'var(--warn)',
  3: 'var(--ok)',
};

/**
 * Şifre alanının altındaki güç göstergesi. Tavsiye niteliğinde, hiçbir şeyi
 * engellemez. Dört segmentli düz çubuk, yanında düz metin etiket.
 */
export function PasswordStrengthMeter({ password, userHints = [] }: PasswordStrengthMeterProps) {
  const { level, label, hint } = scorePassword(password, userHints);
  const doluSegment = password ? level + 1 : 0;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-[1px]"
              style={{ background: i < doluSegment ? SEGMENT_COLOR[level] : 'var(--rule)' }}
            />
          ))}
        </div>
        <span className="text-xs text-[var(--ink-dim)] w-16 text-right">
          {password ? label : ''}
        </span>
      </div>
      <p className="text-xs text-[var(--ink-dim)] mt-1" aria-live="polite">
        {password ? `Şifre gücü: ${label}. ${hint}` : ''}
      </p>
    </div>
  );
}
