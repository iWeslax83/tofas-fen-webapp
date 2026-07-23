/**
 * @vitest-environment jsdom
 */
import type { ReactElement, ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...(actual as object), useNavigate: () => navigateMock };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { rol: 'admin', id: 'admin1' }, isLoading: false }),
}));

vi.mock('../../../utils/api', () => ({
  SecureAPI: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import OgretimYiliPage from '../OgretimYiliPage';
import { ConfirmProvider } from '../../../components/ui/ConfirmDialog';

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>{ui}</ConfirmProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OgretimYiliPage', () => {
  it('bekleyen geçiş yokken bilgi mesajı gösterir', async () => {
    mockGet.mockResolvedValue({ data: { rollover: null } });

    render(<OgretimYiliPage />);

    expect(await screen.findByText(/bekleyen bir öğretim yılı geçişi yok/i)).toBeInTheDocument();
  });

  it('bekleyen geçişin sayaçlarını gösterir', async () => {
    mockGet.mockResolvedValue({
      data: {
        rollover: {
          rolloverId: '11111111-1111-4111-8111-111111111111',
          fromYear: '2025-2026',
          toYear: '2026-2027',
          status: 'proposed',
          counts: { '9->10': 84, graduate: 76 },
          snapshot: [],
        },
      },
    });

    render(<OgretimYiliPage />);

    expect(await screen.findByText('2025-2026 → 2026-2027')).toBeInTheDocument();
    expect(await screen.findByText('84')).toBeInTheDocument();
    expect(await screen.findByText('76')).toBeInTheDocument();
  });

  it('mezun olacakları ayrı bir bölümde listeler', async () => {
    mockGet.mockResolvedValue({
      data: {
        rollover: {
          rolloverId: '11111111-1111-4111-8111-111111111111',
          fromYear: '2025-2026',
          toYear: '2026-2027',
          status: 'proposed',
          counts: { graduate: 1 },
          snapshot: [
            { userId: 'ogr_1', adSoyad: 'Ayşe Yılmaz', fromSinif: '12', action: 'graduate' },
          ],
        },
      },
    });

    render(<OgretimYiliPage />);

    expect(await screen.findByText(/hesabı kapatılacak/i)).toBeInTheDocument();
    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
  });
});
