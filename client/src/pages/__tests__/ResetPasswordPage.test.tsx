/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const post = vi.hoisted(() => vi.fn());
vi.mock('../../utils/api', () => ({ SecureAPI: { post } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ResetPasswordPage from '../ResetPasswordPage';

const ekranaBas = (arama: string) =>
  render(
    <MemoryRouter initialEntries={[`/reset-password${arama}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>GIRIS_EKRANI</div>} />
      </Routes>
    </MemoryRouter>,
  );

const GECERLI = '?token=ornek-token&id=ZYR-1';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('bağlantıdaki token ve id ile şifre belirleme formunu gösterir', () => {
    ekranaBas(GECERLI);

    expect(screen.getByLabelText('Yeni şifre')).toBeInTheDocument();
    expect(screen.getByLabelText('Yeni şifre (tekrar)')).toBeInTheDocument();
  });

  it('token eksikse formu göstermez ve ne yapılacağını söyler', () => {
    ekranaBas('?id=ZYR-1');

    expect(screen.queryByLabelText('Yeni şifre')).not.toBeInTheDocument();
    expect(screen.getByText(/bağlantı eksik veya bozuk/i)).toBeInTheDocument();
  });

  it('iki şifre farklıysa kaydetmez', async () => {
    const kullanici = userEvent.setup();
    ekranaBas(GECERLI);

    await kullanici.type(screen.getByLabelText('Yeni şifre'), 'yenisifre');
    await kullanici.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'baskasifre');
    await kullanici.click(screen.getByRole('button', { name: 'Şifreyi belirle' }));

    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText('İki şifre aynı değil.')).toBeInTheDocument();
  });

  it('6 karakterden kısa şifreyi kaydetmez', async () => {
    const kullanici = userEvent.setup();
    ekranaBas(GECERLI);

    await kullanici.type(screen.getByLabelText('Yeni şifre'), 'kisa1');
    await kullanici.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'kisa1');
    await kullanici.click(screen.getByRole('button', { name: 'Şifreyi belirle' }));

    expect(post).not.toHaveBeenCalled();
  });

  it('geçerli şifreyi token ve id ile birlikte gönderir', async () => {
    const kullanici = userEvent.setup();
    post.mockResolvedValue({ data: { success: true } });
    ekranaBas(GECERLI);

    await kullanici.type(screen.getByLabelText('Yeni şifre'), 'yenisifre');
    await kullanici.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'yenisifre');
    await kullanici.click(screen.getByRole('button', { name: 'Şifreyi belirle' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/auth/reset-password', {
        id: 'ZYR-1',
        token: 'ornek-token',
        newPassword: 'yenisifre',
      }),
    );
  });

  it('başarılı olunca giriş ekranına götürür', async () => {
    const kullanici = userEvent.setup();
    post.mockResolvedValue({ data: { success: true } });
    ekranaBas(GECERLI);

    await kullanici.type(screen.getByLabelText('Yeni şifre'), 'yenisifre');
    await kullanici.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'yenisifre');
    await kullanici.click(screen.getByRole('button', { name: 'Şifreyi belirle' }));

    await waitFor(() => expect(screen.getByText('GIRIS_EKRANI')).toBeInTheDocument());
  });

  it('süresi dolmuş bağlantıda ne yapılacağını anlatır', async () => {
    const kullanici = userEvent.setup();
    post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: 'Geçersiz veya süresi dolmuş sıfırlama bağlantısı' },
      },
    });
    ekranaBas(GECERLI);

    await kullanici.type(screen.getByLabelText('Yeni şifre'), 'yenisifre');
    await kullanici.type(screen.getByLabelText('Yeni şifre (tekrar)'), 'yenisifre');
    await kullanici.click(screen.getByRole('button', { name: 'Şifreyi belirle' }));

    await waitFor(() => expect(screen.getByText(/süresi dolmuş/i)).toBeInTheDocument());
  });
});
