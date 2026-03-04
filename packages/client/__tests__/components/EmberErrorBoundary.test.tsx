import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmberErrorBoundary } from '../../src/components/EmberErrorBoundary';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content</div>;
}

describe('EmberErrorBoundary', () => {
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
      <EmberErrorBoundary>
        <div>Hello</div>
      </EmberErrorBoundary>
    );

    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('should render static fallback on error', () => {
    render(
      <EmberErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowingComponent shouldThrow={true} />
      </EmberErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('should render fallback function with error and reset', () => {
    render(
      <EmberErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={reset}>Reset</button>
          </div>
        )}
      >
        <ThrowingComponent shouldThrow={true} />
      </EmberErrorBoundary>
    );

    expect(screen.getByText('Error: Test error')).toBeDefined();
    expect(screen.getByText('Reset')).toBeDefined();
  });

  it('should render null when no fallback provided', () => {
    const { container } = render(
      <EmberErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </EmberErrorBoundary>
    );

    expect(container.innerHTML).toBe('');
  });

  it('should call onError callback', () => {
    const onError = vi.fn();

    render(
      <EmberErrorBoundary onError={onError} fallback={<div>Error</div>}>
        <ThrowingComponent shouldThrow={true} />
      </EmberErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ componentStack: expect.any(String) }));
  });
});
