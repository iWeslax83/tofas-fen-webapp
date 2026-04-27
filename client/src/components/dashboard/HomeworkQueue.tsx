import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCaption,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from '../ui/DocumentTable';
import { Chip } from '../ui/Chip';

export interface HomeworkRow {
  id: string;
  code: string;
  subject: string;
  dueLabel: string;
  /** When true, the due-chip turns kırmızı (bugün/yarın gibi acil). */
  urgent?: boolean;
}

export interface HomeworkQueueProps {
  rows: HomeworkRow[];
}

/**
 * TABLO III — ödev kuyruğu. Devlet stili: mono başlık, ders kodu,
 * süreyi gösteren chip (gerekirse kırmızı).
 */
export function HomeworkQueue({ rows }: HomeworkQueueProps) {
  if (rows.length === 0) return null;
  return (
    <section>
      <DocumentTable>
        <DocumentTableCaption>Tablo III — Ödev Kuyruğu</DocumentTableCaption>
        <DocumentTableHeader>
          <DocumentTableRow>
            <DocumentTableHead className="w-10" aria-label="Tamamla" />
            <DocumentTableHead>Kod</DocumentTableHead>
            <DocumentTableHead>Ders</DocumentTableHead>
            <DocumentTableHead className="text-right">Süre</DocumentTableHead>
          </DocumentTableRow>
        </DocumentTableHeader>
        <DocumentTableBody>
          {rows.map((row) => (
            <DocumentTableRow key={row.id}>
              <DocumentTableCell>
                <input
                  type="checkbox"
                  className="accent-[var(--ink)]"
                  aria-label={`${row.subject} ödevini işaretle`}
                />
              </DocumentTableCell>
              <DocumentTableCell className="font-mono text-[var(--ink-dim)]">
                {row.code}
              </DocumentTableCell>
              <DocumentTableCell className="font-serif text-[var(--ink)]">
                {row.subject}
              </DocumentTableCell>
              <DocumentTableCell className="text-right">
                <Chip tone={row.urgent ? 'state' : 'default'}>{row.dueLabel}</Chip>
              </DocumentTableCell>
            </DocumentTableRow>
          ))}
        </DocumentTableBody>
      </DocumentTable>
    </section>
  );
}
