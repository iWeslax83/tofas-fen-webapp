/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '../Dialog';

describe('Dialog', () => {
  it('does not render anything when open=false', () => {
    const { container } = render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>hidden</DialogContent>
      </Dialog>,
    );
    // body remains untouched, no dialog visible
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.querySelector('.dialog-overlay')).toBeNull();
  });

  it('renders into document.body via portal when open=true', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>hello</DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    // Portal targets document.body — overlay lives there
    expect(document.body.querySelector('.dialog-overlay')).not.toBeNull();
  });

  it('marks the dialog with aria-modal=true and connects label/description ids', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        <DialogTitle>Başlık</DialogTitle>
        <DialogDescription>Açıklama</DialogDescription>
      </Dialog>,
    );
    const dlg = screen.getByRole('dialog');
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    expect(dlg).toHaveAttribute('aria-labelledby', 'dialog-title');
    expect(dlg).toHaveAttribute('aria-describedby', 'dialog-description');
    expect(screen.getByText('Başlık').id).toBe('dialog-title');
    expect(screen.getByText('Açıklama').id).toBe('dialog-description');
  });

  it('renders the close button by default with the canonical Turkish aria-label', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        x
      </Dialog>,
    );
    expect(screen.getByLabelText('Kapat')).toBeInTheDocument();
  });

  it('omits the close button when showCloseButton=false', () => {
    render(
      <Dialog open onOpenChange={() => {}} showCloseButton={false}>
        x
      </Dialog>,
    );
    expect(screen.queryByLabelText('Kapat')).toBeNull();
  });

  it('clicking the close button calls onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        x
      </Dialog>,
    );
    await user.click(screen.getByLabelText('Kapat'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clicking the overlay calls onOpenChange(false) by default', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        x
      </Dialog>,
    );
    const overlay = document.body.querySelector('.dialog-overlay');
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('overlay click does NOT close when closeOnOverlayClick=false', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} closeOnOverlayClick={false}>
        x
      </Dialog>,
    );
    const overlay = document.body.querySelector('.dialog-overlay');
    await user.click(overlay as HTMLElement);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('clicking inside the dialog does NOT close it (event stopped)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <span data-testid="inside">click me</span>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByTestId('inside'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('Escape closes the dialog by default', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        x
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Escape does NOT close when closeOnEscape=false', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} closeOnEscape={false}>
        x
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('locks body scroll while open and restores it on unmount', () => {
    document.body.style.overflow = '';
    const { unmount } = render(
      <Dialog open onOpenChange={() => {}}>
        x
      </Dialog>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('applies the size class on the dialog node', () => {
    render(
      <Dialog open onOpenChange={() => {}} size="lg">
        x
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).toContain('dialog-lg');
  });

  it('defaults to size=md when not specified', () => {
    render(
      <Dialog open onOpenChange={() => {}}>
        x
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).toContain('dialog-md');
  });
});

describe('Dialog sub-components', () => {
  it('DialogContent / Header / Body / Footer wrap children with their named class', () => {
    const { container } = render(
      <DialogContent>
        <DialogHeader>
          <DialogTitle>t</DialogTitle>
          <DialogDescription>d</DialogDescription>
        </DialogHeader>
        <DialogBody>body</DialogBody>
        <DialogFooter>footer</DialogFooter>
      </DialogContent>,
    );
    expect(container.querySelector('.dialog-content')).not.toBeNull();
    expect(container.querySelector('.dialog-header')).not.toBeNull();
    expect(container.querySelector('.dialog-title')).not.toBeNull();
    expect(container.querySelector('.dialog-description')).not.toBeNull();
    expect(container.querySelector('.dialog-body')).not.toBeNull();
    expect(container.querySelector('.dialog-footer')).not.toBeNull();
  });

  it('DialogBody adds dialog-body-scrollable when scrollable=true (default)', () => {
    const { container } = render(<DialogBody>x</DialogBody>);
    expect(container.querySelector('.dialog-body-scrollable')).not.toBeNull();
  });

  it('DialogBody omits dialog-body-scrollable when scrollable=false', () => {
    const { container } = render(<DialogBody scrollable={false}>x</DialogBody>);
    expect(container.querySelector('.dialog-body-scrollable')).toBeNull();
  });

  it('DialogTitle renders as h2 with id=dialog-title', () => {
    render(<DialogTitle>t</DialogTitle>);
    const h = screen.getByText('t');
    expect(h.tagName).toBe('H2');
    expect(h).toHaveAttribute('id', 'dialog-title');
  });

  it('DialogDescription renders as p with id=dialog-description', () => {
    render(<DialogDescription>d</DialogDescription>);
    const p = screen.getByText('d');
    expect(p.tagName).toBe('P');
    expect(p).toHaveAttribute('id', 'dialog-description');
  });
});
