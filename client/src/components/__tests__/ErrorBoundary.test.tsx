import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock the safeLogger to avoid import side effects
vi.mock('../../utils/safeLogger', () => ({
  ultraSafeErrorLog: vi.fn(),
}));

// A component that deliberately throws an error for testing
function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error from child component');
  }
  return <div data-testid="child-content">Child rendered successfully</div>;
}

// Suppress console.error during error boundary tests (React logs caught errors)
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="healthy-child">All good</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('should render multiple children without issues', () => {
    render(
      <ErrorBoundary>
        <p>First child</p>
        <p>Second child</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
  });

  it('should display error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    // The default error UI should show the Turkish error heading
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();

    // Should show the retry and home buttons
    expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();
    expect(screen.getByText('Ana Sayfaya Dön')).toBeInTheDocument();
  });

  it('should render custom fallback when provided and child throws', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error page</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error page')).toBeInTheDocument();

    // The default error UI should NOT be rendered
    expect(screen.queryByText('Bir Hata Oluştu')).not.toBeInTheDocument();
  });

  it('should recover when the retry button is clicked', () => {
    // We wrap ThrowingChild with a stateful wrapper so we can control the throw
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('Conditional error');
      }
      return <div data-testid="recovered">Recovered successfully</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    // Error UI should be visible
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();

    // Stop throwing before clicking retry
    shouldThrow = false;

    // Click the retry button
    fireEvent.click(screen.getByText('Tekrar Dene'));

    // After retry, children should render again
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    expect(screen.queryByText('Bir Hata Oluştu')).not.toBeInTheDocument();
  });

  it('should reset error state when resetKey prop changes', () => {
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('ResetKey error');
      }
      return <div data-testid="reset-recovered">Reset recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary resetKey="key-1">
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    // Error UI should be visible
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();

    // Stop throwing and change the resetKey
    shouldThrow = false;

    rerender(
      <ErrorBoundary resetKey="key-2">
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    // Should have recovered via resetKey change
    expect(screen.getByTestId('reset-recovered')).toBeInTheDocument();
    expect(screen.queryByText('Bir Hata Oluştu')).not.toBeInTheDocument();
  });
});
