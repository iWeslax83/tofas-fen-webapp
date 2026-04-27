import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '../hooks/useTheme';

const ICON_BY_THEME = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const NEXT_THEME: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const LABEL: Record<Theme, string> = {
  light: 'Açık tema',
  dark: 'Koyu tema',
  system: 'Sistem teması',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICON_BY_THEME[theme];
  const next = NEXT_THEME[theme];
  return (
    <button
      type="button"
      className="notif-bell-btn"
      aria-label={`Tema: ${LABEL[theme]}. Tıklayınca ${LABEL[next].toLowerCase()}.`}
      title={LABEL[theme]}
      onClick={() => setTheme(next)}
    >
      <Icon size={20} />
    </button>
  );
}
