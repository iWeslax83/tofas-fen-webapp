import { useEffect } from 'react';

/**
 * usePageTitle — set document.title for the current page and restore the
 * previous title on unmount (F-M12).
 *
 * The app never updated document.title per-route, so the browser tab always
 * showed the base title. Non-trivial for accessibility (screen readers
 * announce the tab title on navigation) and for multi-tab users who need to
 * tell their open pages apart.
 *
 * Usage:
 *   usePageTitle('Notlar');              // -> "Notlar · Tofaş Fen Lisesi"
 *   usePageTitle('Giriş', { suffix: '' }); // -> "Giriş"
 */

const DEFAULT_SUFFIX = 'Tofaş Fen Lisesi';

interface Options {
  /** Text appended after " · ". Pass "" to disable. Defaults to app name. */
  suffix?: string;
  /** Override separator. Defaults to " · ". */
  separator?: string;
}

export function usePageTitle(title: string, options: Options = {}): void {
  const { suffix = DEFAULT_SUFFIX, separator = ' · ' } = options;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.title;
    document.title = suffix ? `${title}${separator}${suffix}` : title;
    return () => {
      document.title = previous;
    };
  }, [title, suffix, separator]);
}
