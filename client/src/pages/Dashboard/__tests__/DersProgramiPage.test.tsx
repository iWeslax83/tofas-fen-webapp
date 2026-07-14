/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ClassSchedule } from '../../../types/schedule';

const getSchedules = vi.fn();

vi.mock('../../../hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({ user: { id: 'student1', rol: 'student' } }),
}));

vi.mock('../../../utils/apiService', () => ({
  ScheduleService: { getSchedules: () => getSchedules() },
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import DersProgramiPage from '../DersProgramiPage';

const SCHEDULE: ClassSchedule = {
  id: 's1',
  classLevel: '9',
  classSection: 'A',
  academicYear: '2025-2026',
  semester: '1. Dönem',
  isActive: true,
  schedule: [
    { day: 'Pazartesi', periods: [{ period: 1, subject: 'Matematik' }] },
    { day: 'Salı', periods: [{ period: 1, subject: 'Fizik' }] },
  ],
};

describe('DersProgramiPage', () => {
  beforeEach(() => {
    getSchedules.mockResolvedValue({ data: [SCHEDULE], error: null });
  });

  it('opens only the day that was clicked', async () => {
    render(<DersProgramiPage />);
    await waitFor(() => expect(screen.getByText('Pazartesi')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Pazartesi'));
    expect(screen.getByText(/Matematik/)).toBeInTheDocument();
    expect(screen.queryByText(/Fizik/)).toBeNull();

    // Switching days closes the previous one rather than stacking.
    await userEvent.click(screen.getByText('Salı'));
    expect(screen.getByText(/Fizik/)).toBeInTheDocument();
    expect(screen.queryByText(/Matematik/)).toBeNull();
  });

  it('closes the open day when it is clicked again', async () => {
    render(<DersProgramiPage />);
    await waitFor(() => expect(screen.getByText('Pazartesi')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Pazartesi'));
    expect(screen.getByText(/Matematik/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Pazartesi'));
    expect(screen.queryByText(/Matematik/)).toBeNull();
  });

  it('shows no "Son güncelleme" stamp', async () => {
    render(<DersProgramiPage />);
    await waitFor(() => expect(screen.getByText('Pazartesi')).toBeInTheDocument());
    expect(screen.queryByText(/Son güncelleme/i)).toBeNull();
  });

  it('says so plainly when the server has no schedule', async () => {
    getSchedules.mockResolvedValue({ data: [], error: null });
    render(<DersProgramiPage />);
    await waitFor(() => expect(screen.getByText('Ders programı bulunamadı')).toBeInTheDocument());
  });
});
