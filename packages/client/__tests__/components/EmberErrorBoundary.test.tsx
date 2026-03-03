import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BonfireErrorBoundary } from '../../src/components/BonfireErrorBoundary';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content</div>;
}

describe('BonfireErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('should render children when no error', () => {
    render(
      <BonfireErrorBoundary>
        <div>Hello</div>
      </BonfireErrorBoundary>
    );

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('should render static fallback on error', () => {
    render(
      <BonfireErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowingComponent shouldThrow={true} />
      </BonfireErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('should render fallback function with error and reset', () => {
    render(
      <BonfireErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={reset}>Reset</button>
          </div>
        )}
      >
        <ThrowingComponent shouldThrow={true} />
      </BonfireErrorBoundary>
    );

    expect(screen.getByText('Error: Test error')).toBeDefined();
    expect(screen.getByText('Reset')).toBeDefined();
  });

  it('should render null when no fallback provided', () => {
    const { container } = render(
      <BonfireErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </BonfireErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
  });

  it('should call onError callback', () => {
    const onError = vi.fn();

    render(
      <BonfireErrorBoundary onError={onError} fallback={<div>Error</div>}>
        <ThrowingComponent shouldThrow={true} />
      </BonfireErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ componentStack: expect.any(String) }));
  });
});
