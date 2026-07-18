/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { rol: 'student', id: 'student1' } }),
}));

vi.mock('../../../components/ModernDashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import HelpPage from '../HelpPage';

describe('HelpPage', () => {
  it('shows every FAQ by default and answers stay collapsed', () => {
    render(<HelpPage />);
    expect(screen.getByText('Sisteme nasıl giriş yapabilirim?')).toBeInTheDocument();
    expect(screen.getByText('Kulüplere nasıl katılabilirim?')).toBeInTheDocument();
    expect(screen.queryByText(/Ana sayfadaki giriş formunu kullanarak/)).toBeNull();
  });

  it('expands an answer on click and collapses it again on a second click', async () => {
    render(<HelpPage />);
    const question = screen.getByText('Sisteme nasıl giriş yapabilirim?');

    await userEvent.click(question);
    expect(screen.getByText(/Ana sayfadaki giriş formunu kullanarak/)).toBeInTheDocument();

    await userEvent.click(question);
    expect(screen.queryByText(/Ana sayfadaki giriş formunu kullanarak/)).toBeNull();
  });

  it('narrows the list to one category when a category card is clicked', async () => {
    render(<HelpPage />);
    await userEvent.click(screen.getByText('Kulüpler'));

    expect(screen.getByText('Kulüplere nasıl katılabilirim?')).toBeInTheDocument();
    expect(screen.queryByText('Sisteme nasıl giriş yapabilirim?')).toBeNull();
  });

  it('filters by search term across question and answer text', async () => {
    render(<HelpPage />);
    await userEvent.type(screen.getByPlaceholderText('Aradığınız soruyu yazın…'), 'mobil uygulama');

    expect(screen.getByText('Mobil uygulamayı nasıl indirebilirim?')).toBeInTheDocument();
    expect(screen.queryByText('Sisteme nasıl giriş yapabilirim?')).toBeNull();
  });

  it('says so plainly when no FAQ matches the search', async () => {
    render(<HelpPage />);
    await userEvent.type(
      screen.getByPlaceholderText('Aradığınız soruyu yazın…'),
      'zzz-yok-boyle-bir-sey',
    );

    expect(screen.getByText('Aramanızla eşleşen bir soru bulunamadı.')).toBeInTheDocument();
  });
});
