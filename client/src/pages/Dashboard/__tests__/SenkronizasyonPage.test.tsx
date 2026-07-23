/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listUsersMock = vi.fn();
const getUsersMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => navigateMock };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { rol: 'admin', id: 'admin1' }, isLoading: false }),
}));

vi.mock('../../../utils/apiService', () => ({
  UserService: {
    getUsers: (...args: unknown[]) => getUsersMock(...args),
    listUsers: (...args: unknown[]) => listUsersMock(...args),
    deleteUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../AddUserModal', () => ({ default: () => null }));
vi.mock('../EditUserModal', () => ({ default: () => null }));

import SenkronizasyonPage from '../SenkronizasyonPage';

function userAt(n: number, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `u${n}`,
    adSoyad: `Kullanıcı ${n}`,
    rol: 'student',
    sinif: '9',
    sube: 'A',
    ...overrides,
  };
}

function pageOfUsers(page: number, limit: number, total: number) {
  const start = (page - 1) * limit;
  const count = Math.min(limit, Math.max(total - start, 0));
  return Array.from({ length: count }, (_, i) => userAt(start + i + 1));
}

beforeEach(() => {
  vi.clearAllMocks();
  getUsersMock.mockResolvedValue({ data: [], error: null });
});

describe('SenkronizasyonPage — server-side pagination', () => {
  it('renders only one page worth of rows for a large roster, not every user at once', async () => {
    const total = 460;
    listUsersMock.mockImplementation(async ({ page, limit }: { page: number; limit: number }) => ({
      data: {
        users: pageOfUsers(page, limit, total),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      error: null,
    }));

    render(<SenkronizasyonPage />);

    await waitFor(() => expect(screen.getByText(/Sayfa 1 \//)).toBeInTheDocument());
    expect(screen.getByText(/Toplam 460 kullanıcı/)).toBeInTheDocument();

    // Exactly one page's worth of "Düzenle" buttons in the DOM, not 460.
    const editButtons = screen.getAllByText('Düzenle');
    expect(editButtons.length).toBe(20);

    expect(listUsersMock).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('advancing to the next page requests page 2 and swaps the visible rows', async () => {
    const total = 460;
    listUsersMock.mockImplementation(async ({ page, limit }: { page: number; limit: number }) => ({
      data: {
        users: pageOfUsers(page, limit, total),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      error: null,
    }));

    render(<SenkronizasyonPage />);

    await waitFor(() => expect(screen.getByText('Kullanıcı 1')).toBeInTheDocument());
    expect(screen.queryByText('Kullanıcı 21')).toBeNull();

    await userEvent.click(screen.getByText('Sonraki'));

    await waitFor(() =>
      expect(listUsersMock).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
    await waitFor(() => expect(screen.getByText('Kullanıcı 21')).toBeInTheDocument());
    expect(screen.queryByText('Kullanıcı 1')).toBeNull();
  });

  it('changing the role filter resets to page 1 and passes the role through', async () => {
    listUsersMock.mockResolvedValue({
      data: {
        users: [userAt(1, { rol: 'teacher' })],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: null,
    });

    render(<SenkronizasyonPage />);
    await waitFor(() => expect(listUsersMock).toHaveBeenCalled());

    listUsersMock.mockClear();
    await userEvent.selectOptions(screen.getAllByRole('combobox')[0], 'teacher');

    await waitFor(() =>
      expect(listUsersMock).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'teacher', page: 1 }),
      ),
    );
  });

  it('debounces the name search instead of firing a request per keystroke', async () => {
    listUsersMock.mockResolvedValue({
      data: { users: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
      error: null,
    });

    render(<SenkronizasyonPage />);
    await waitFor(() => expect(listUsersMock).toHaveBeenCalledTimes(1));

    listUsersMock.mockClear();
    const searchInput = screen.getByPlaceholderText('İsim ile ara...');
    await userEvent.type(searchInput, 'Ali');

    // No request yet — still within the debounce window.
    expect(listUsersMock).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(listUsersMock).toHaveBeenCalledWith(expect.objectContaining({ search: 'Ali' })),
    );
    expect(listUsersMock).toHaveBeenCalledTimes(1);
  });
});
