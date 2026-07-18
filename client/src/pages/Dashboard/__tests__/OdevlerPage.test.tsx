/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const getHomeworksMock = vi.fn();

vi.mock('../../../hooks/useAuthGuard', () => ({
  // admin sees every homework unfiltered — student/parent role require
  // matching class-level fields this test doesn't need to exercise.
  useAuthGuard: () => ({ user: { rol: 'admin', id: 'admin1' }, isLoading: false }),
}));

vi.mock('../../../utils/apiService', () => ({
  HomeworkService: {
    getHomeworks: (...args: unknown[]) => getHomeworksMock(...args),
    deleteHomework: vi.fn(),
    createHomework: vi.fn(),
  },
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import OdevlerPage from '../OdevlerPage';

describe('OdevlerPage — overdue label', () => {
  it('labels a past-due homework "Gecikmiş", not "Geçti"', async () => {
    const yesterday = new Date(Date.now() - 2 * 86_400_000).toISOString();
    getHomeworksMock.mockResolvedValue({
      data: [
        {
          _id: 'hw1',
          title: 'Geçmiş Ödev',
          description: 'Test',
          dueDate: yesterday,
          subject: 'Matematik',
        },
      ],
      error: null,
    });

    render(<OdevlerPage />);

    await waitFor(() => expect(screen.getByText('Gecikmiş')).toBeInTheDocument());
    expect(screen.queryByText('Geçti')).toBeNull();
  });
});
