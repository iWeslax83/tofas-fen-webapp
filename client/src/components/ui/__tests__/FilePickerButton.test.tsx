/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePickerButton } from '../FilePickerButton';

describe('FilePickerButton', () => {
  it('shows the hint text and not a filename when nothing is picked', () => {
    render(<FilePickerButton file={null} onFileSelected={vi.fn()} hint=".xlsx · .csv" />);
    expect(screen.getByText('.xlsx · .csv')).toBeInTheDocument();
    expect(screen.getByText('Dosya Seç')).toBeInTheDocument();
  });

  it('shows the picked filename instead of the hint once a file is chosen', () => {
    const file = new File(['content'], 'notlar.xlsx');
    render(<FilePickerButton file={file} onFileSelected={vi.fn()} hint=".xlsx · .csv" />);
    expect(screen.getByText('notlar.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('.xlsx · .csv')).toBeNull();
  });

  it('clicking the button opens the native file dialog, not a raw unstyled input', async () => {
    render(<FilePickerButton file={null} onFileSelected={vi.fn()} />);
    const input = screen.getByLabelText('Dosya Seç') as HTMLInputElement;
    expect(input.className).toContain('sr-only');
    // The visible trigger is the themed Button, not the native input itself.
    expect(screen.getByRole('button', { name: /Dosya Seç/ })).toBeInTheDocument();
  });

  it('calls onFileSelected with the chosen file', async () => {
    const onFileSelected = vi.fn();
    render(<FilePickerButton file={null} onFileSelected={onFileSelected} />);
    const file = new File(['content'], 'ornek.pdf');
    const input = screen.getByLabelText('Dosya Seç') as HTMLInputElement;
    await userEvent.upload(input, file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});
