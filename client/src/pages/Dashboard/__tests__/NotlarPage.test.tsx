/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const useNotesMock = vi.fn();
const useDashboardOverviewMock = vi.fn();
let currentUser: { rol: string; id?: string } = { rol: 'student', id: 'student1' };

vi.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: currentUser }),
}));

vi.mock('../../../hooks/queries/noteQueries', () => ({
  useNotes: (...args: unknown[]) => useNotesMock(...args),
}));

vi.mock('../../../hooks/queries/useDashboardOverview', () => ({
  useDashboardOverview: () => useDashboardOverviewMock(),
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import NotlarPage from '../NotlarPage';

const noteFor = (studentId: string, studentName: string, gradeLevel = '9', classSection = 'A') => ({
  studentId,
  studentName,
  lesson: 'Matematik',
  exam1: 80,
  exam2: 90,
  oral: 85,
  average: 85,
  semester: '1',
  gradeLevel,
  classSection,
});

beforeEach(() => {
  vi.clearAllMocks();
  useDashboardOverviewMock.mockReturnValue({ data: undefined, isLoading: false });
});

describe('NotlarPage — student', () => {
  it('keeps the plain "Notlarım" view with no child selector', async () => {
    currentUser = { rol: 'student', id: 'student1' };
    useNotesMock.mockReturnValue({
      data: { data: [noteFor('student1', 'Ali Veli')] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<NotlarPage />);

    await waitFor(() => expect(screen.getByText('Notlarım')).toBeInTheDocument());
    expect(screen.queryByLabelText('Çocuk seçin')).toBeNull();
    expect(screen.queryByText('Öğrenci')).toBeNull();
  });
});

describe('NotlarPage — teacher', () => {
  it('shows a class-scoped table with a student column, not a personal grade table', async () => {
    currentUser = { rol: 'teacher', id: 'teacher1' };
    useNotesMock.mockReturnValue({
      data: {
        data: [
          noteFor('student1', 'Ali Veli', '9', 'A'),
          noteFor('student2', 'Fatma Nur', '9', 'A'),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<NotlarPage />);

    await waitFor(() => expect(screen.getByText('Sınıf Notları')).toBeInTheDocument());
    expect(screen.getByText('Öğrenci')).toBeInTheDocument();
    expect(screen.getByText('Ali Veli')).toBeInTheDocument();
    expect(screen.getByText('Fatma Nur')).toBeInTheDocument();
    expect(screen.queryByText('Notlarım')).toBeNull();
  });
});

describe('NotlarPage — parent', () => {
  it('shows a child selector and titles the page after the selected child', async () => {
    currentUser = { rol: 'parent', id: 'parent1' };
    useDashboardOverviewMock.mockReturnValue({
      data: {
        data: {
          role: 'parent',
          overview: {
            children: [
              { id: 'student1', adSoyad: 'Ahmet Yılmaz', sinif: '9A', averageGrade: 81.7 },
              { id: 'student2', adSoyad: 'Zeynep Arslan', sinif: '10B', averageGrade: 0 },
            ],
          },
        },
      },
      isLoading: false,
    });
    useNotesMock.mockReturnValue({
      data: { data: [noteFor('student1', 'Ahmet Yılmaz')] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<NotlarPage />);

    await waitFor(() => expect(screen.getByText('Notlar — Ahmet Yılmaz')).toBeInTheDocument());
    expect(screen.getByLabelText('Çocuk seçin')).toBeInTheDocument();

    // The most recent useNotes call should scope to the selected child.
    const lastCallArgs = useNotesMock.mock.calls.at(-1);
    expect(lastCallArgs?.[0]).toMatchObject({ studentId: 'student1' });

    await userEvent.selectOptions(screen.getByLabelText('Çocuk seçin'), 'student2');
    await waitFor(() => expect(screen.getByText('Notlar — Zeynep Arslan')).toBeInTheDocument());
  });

  it('tells the parent plainly when no child is linked', async () => {
    currentUser = { rol: 'parent', id: 'parent-no-kids' };
    useDashboardOverviewMock.mockReturnValue({
      data: { data: { role: 'parent', overview: { children: [] } } },
      isLoading: false,
    });
    useNotesMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<NotlarPage />);

    await waitFor(() =>
      expect(screen.getByText('Hesabınıza bağlı bir öğrenci bulunamadı.')).toBeInTheDocument(),
    );
  });
});
