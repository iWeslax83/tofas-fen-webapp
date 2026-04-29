/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  Skeleton,
  SkeletonText,
  SkeletonTable,
  SkeletonForm,
  SkeletonList,
  SkeletonCalendar,
  SkeletonChart,
  LoadingState,
} from '../SkeletonComponents';

describe('Skeleton primitives', () => {
  it('Skeleton wraps children with the .skeleton class plus user className', () => {
    const { container } = render(
      <Skeleton className="extra">
        <span data-testid="child" />
      </Skeleton>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('skeleton');
    expect(root.className).toContain('extra');
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('SkeletonText renders one line by default', () => {
    const { container } = render(<SkeletonText />);
    expect(container.querySelectorAll('.skeleton-line')).toHaveLength(1);
  });

  it('SkeletonText honours a custom line count', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll('.skeleton-line')).toHaveLength(4);
  });

  it('SkeletonTable defaults to 5 rows × 4 columns', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelectorAll('.skeleton-table-row')).toHaveLength(5);
    expect(container.querySelectorAll('.skeleton-table-header-cell')).toHaveLength(4);
  });

  it('SkeletonTable honours custom rows × columns', () => {
    const { container } = render(<SkeletonTable rows={2} columns={3} />);
    expect(container.querySelectorAll('.skeleton-table-row')).toHaveLength(2);
    expect(container.querySelectorAll('.skeleton-table-header-cell')).toHaveLength(3);
    // rows × cols cells in the body
    expect(container.querySelectorAll('.skeleton-table-cell')).toHaveLength(6);
  });

  it('SkeletonForm defaults to 4 fields', () => {
    const { container } = render(<SkeletonForm />);
    expect(container.querySelectorAll('.skeleton-form-field')).toHaveLength(4);
  });

  it('SkeletonForm honours custom field count', () => {
    const { container } = render(<SkeletonForm fields={2} />);
    expect(container.querySelectorAll('.skeleton-form-field')).toHaveLength(2);
  });

  it('SkeletonList defaults to 5 items', () => {
    const { container } = render(<SkeletonList />);
    expect(container.querySelectorAll('.skeleton-list-item')).toHaveLength(5);
  });

  it('SkeletonList honours custom item count', () => {
    const { container } = render(<SkeletonList items={3} />);
    expect(container.querySelectorAll('.skeleton-list-item')).toHaveLength(3);
  });

  it('SkeletonCalendar always renders 42 day cells (6 weeks × 7 days)', () => {
    const { container } = render(<SkeletonCalendar />);
    expect(container.querySelectorAll('.skeleton-calendar-day')).toHaveLength(42);
  });

  it('SkeletonChart renders 7 bars (one per weekday)', () => {
    const { container } = render(<SkeletonChart />);
    expect(container.querySelectorAll('.skeleton-chart-bar')).toHaveLength(7);
  });
});

describe('LoadingState', () => {
  it('renders the skeleton while isLoading is true', () => {
    render(
      <LoadingState isLoading skeleton={<div data-testid="skel">SKEL</div>}>
        <div data-testid="content">CONTENT</div>
      </LoadingState>,
    );
    expect(screen.getByTestId('skel')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).toBeNull();
  });

  it('renders the error UI with retry button when an error is supplied', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <LoadingState isLoading={false} error="boom" onRetry={onRetry}>
        <div data-testid="content">CONTENT</div>
      </LoadingState>,
    );
    expect(screen.getByText('Bir hata oluştu')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tekrar Dene' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the error UI without a retry button when onRetry is omitted', () => {
    render(
      <LoadingState isLoading={false} error="boom">
        <div>CONTENT</div>
      </LoadingState>,
    );
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tekrar Dene' })).toBeNull();
  });

  it('renders children when not loading and no error', () => {
    render(
      <LoadingState isLoading={false} error={null}>
        <div data-testid="content">CONTENT</div>
      </LoadingState>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
