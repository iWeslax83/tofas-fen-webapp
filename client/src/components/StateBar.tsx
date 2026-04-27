/**
 * Devlet T.C. üst bandı — kırmızı resmi şerit. Sticky, 30px yüksekliğinde,
 * mockup'taki ministerial görünümü taklit eder.
 */
export function StateBar() {
  return (
    <div
      role="banner"
      className="h-[30px] w-full bg-[var(--state)] text-white sticky top-0 z-50 flex items-center px-4 select-none"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
        T.C. · Tofaş Fen Lisesi · Bilgi Sistemi
      </span>
    </div>
  );
}
