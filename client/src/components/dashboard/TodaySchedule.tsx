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

export interface ScheduleRow {
  id: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  isActive?: boolean;
}

export interface TodayScheduleProps {
  rows: ScheduleRow[];
}

/**
 * TABLO II — bugünkü program. The active row is rendered with the
 * state accent bg + an "AKTİF" chip.
 */
export function TodaySchedule({ rows }: TodayScheduleProps) {
  if (rows.length === 0) return null;
  return (
    <section>
      <DocumentTable>
        <DocumentTableCaption>Tablo II — Bugünkü Program</DocumentTableCaption>
        <DocumentTableHeader>
          <DocumentTableRow>
            <DocumentTableHead>Saat</DocumentTableHead>
            <DocumentTableHead>Ders</DocumentTableHead>
            <DocumentTableHead>Sınıf</DocumentTableHead>
            <DocumentTableHead>Öğretmen</DocumentTableHead>
            <DocumentTableHead aria-label="Durum" />
          </DocumentTableRow>
        </DocumentTableHeader>
        <DocumentTableBody>
          {rows.map((row) => (
            <DocumentTableRow
              key={row.id}
              className={row.isActive ? 'bg-[var(--state)]/10 hover:bg-[var(--state)]/15' : ''}
            >
              <DocumentTableCell className="font-mono text-[var(--ink)]">
                {row.time}
              </DocumentTableCell>
              <DocumentTableCell className="font-serif text-[var(--ink)]">
                {row.subject}
              </DocumentTableCell>
              <DocumentTableCell>{row.room}</DocumentTableCell>
              <DocumentTableCell>{row.teacher}</DocumentTableCell>
              <DocumentTableCell>
                {row.isActive && <Chip tone="state">Aktif</Chip>}
              </DocumentTableCell>
            </DocumentTableRow>
          ))}
        </DocumentTableBody>
      </DocumentTable>
    </section>
  );
}
