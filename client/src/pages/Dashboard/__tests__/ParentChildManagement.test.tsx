/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const getUsersMock = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { rol: 'admin', id: 'admin1' } }),
}));

vi.mock('../../../utils/apiService', () => ({
  UserService: {
    getUsers: (...args: unknown[]) => getUsersMock(...args),
    linkParentChild: vi.fn(),
    unlinkParentChild: vi.fn(),
  },
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/EnhancedErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../parent-child', async () => {
  const actual = await vi.importActual('../parent-child');
  return {
    ...(actual as object),
    ParentsList: () => null,
    StudentsList: () => null,
    LinkedPairsList: () => null,
    ConfirmationModal: () => null,
  };
});

import ParentChildManagement from '../ParentChildManagement';

describe('ParentChildManagement — unmatched stats', () => {
  it('shows unmatched parent and student counts as two separate numbers, not a fraction', async () => {
    // 2 parents (1 linked to a student), 3 students (1 linked) — the two
    // "unmatched" counts are unrelated to each other, not numerator/denominator.
    getUsersMock.mockResolvedValue({
      data: [
        { id: 'p1', adSoyad: 'Veli Bir', rol: 'parent', childId: ['s1'] },
        { id: 'p2', adSoyad: 'Veli İki', rol: 'parent', childId: [] },
        { id: 's1', adSoyad: 'Öğrenci Bir', rol: 'student', sinif: '9', sube: 'A' },
        { id: 's2', adSoyad: 'Öğrenci İki', rol: 'student', sinif: '9', sube: 'B' },
        { id: 's3', adSoyad: 'Öğrenci Üç', rol: 'student', sinif: '10', sube: 'A' },
      ],
      error: null,
    });

    render(<ParentChildManagement />);

    await waitFor(() => expect(screen.getByText('Eşleşmemiş Veli')).toBeInTheDocument());
    expect(screen.getByText('Eşleşmemiş Öğrenci')).toBeInTheDocument();

    // Old behavior rendered "1 / 2" as one value under a single "Eşleşmemiş"
    // label — assert that string no longer appears anywhere.
    expect(screen.queryByText('1 / 2')).toBeNull();
    expect(screen.queryByText('Eşleşmemiş')).toBeNull();
  });
});
