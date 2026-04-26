import type { Meta, StoryObj } from '@storybook/react';
import {
  DocumentTable,
  DocumentTableBody,
  DocumentTableCaption,
  DocumentTableCell,
  DocumentTableHead,
  DocumentTableHeader,
  DocumentTableRow,
} from './DocumentTable';

const meta: Meta<typeof DocumentTable> = {
  title: 'Devlet/DocumentTable',
  component: DocumentTable,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof DocumentTable>;

export const TabloI: Story = {
  render: () => (
    <DocumentTable>
      <DocumentTableCaption>Tablo I — Bugünkü ders programı</DocumentTableCaption>
      <DocumentTableHeader>
        <DocumentTableRow>
          <DocumentTableHead>Saat</DocumentTableHead>
          <DocumentTableHead>Ders</DocumentTableHead>
          <DocumentTableHead>Öğretmen</DocumentTableHead>
          <DocumentTableHead>Sınıf</DocumentTableHead>
        </DocumentTableRow>
      </DocumentTableHeader>
      <DocumentTableBody>
        <DocumentTableRow>
          <DocumentTableCell>08:30</DocumentTableCell>
          <DocumentTableCell>Matematik</DocumentTableCell>
          <DocumentTableCell>Ali Yılmaz</DocumentTableCell>
          <DocumentTableCell>11-A</DocumentTableCell>
        </DocumentTableRow>
        <DocumentTableRow>
          <DocumentTableCell>09:30</DocumentTableCell>
          <DocumentTableCell>Türk Dili</DocumentTableCell>
          <DocumentTableCell>Selin Aydın</DocumentTableCell>
          <DocumentTableCell>11-A</DocumentTableCell>
        </DocumentTableRow>
        <DocumentTableRow>
          <DocumentTableCell>10:30</DocumentTableCell>
          <DocumentTableCell>Fizik</DocumentTableCell>
          <DocumentTableCell>Mehmet Demir</DocumentTableCell>
          <DocumentTableCell>11-A</DocumentTableCell>
        </DocumentTableRow>
      </DocumentTableBody>
    </DocumentTable>
  ),
};
