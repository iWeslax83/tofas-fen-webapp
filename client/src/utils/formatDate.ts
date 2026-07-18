/**
 * Shared tr-TR date formatting. Several pages used to define their own
 * near-identical copy of this function — this is the canonical one so new
 * call sites don't duplicate it again, and so a locale change only needs to
 * happen in one place.
 */
export function formatDate(raw: string | Date | undefined): string {
  if (!raw) return '—';
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}
