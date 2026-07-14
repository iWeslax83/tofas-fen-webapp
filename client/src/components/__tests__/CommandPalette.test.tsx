/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from '../CommandPalette';

function renderPalette(onOpenChange = vi.fn()) {
  render(
    <MemoryRouter>
      <CommandPalette open onOpenChange={onOpenChange} role="student" />
    </MemoryRouter>,
  );
  return onOpenChange;
}

describe('CommandPalette', () => {
  it('closes when the X button is clicked', async () => {
    const onOpenChange = renderPalette();
    await userEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('still closes on Escape', async () => {
    const onOpenChange = renderPalette();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
