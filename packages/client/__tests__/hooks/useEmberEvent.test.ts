import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useBonfireEvent } from '../../src/hooks/useBonfireEvent';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockBonfireClient } from '../fixtures/mockBonfireClient';

describe('useBonfireEvent', () => {
  it('should call handler when matching event fires', () => {
    const client = new MockBonfireClient();
    const handler = vi.fn();

    renderWithProvider(() => useBonfireEvent('player:joined', handler), client);

    act(() => {
      client.simulateGameEvent({ type: 'player:joined', payload: { name: 'Alice' } });
    });

    expect(handler).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('should not call handler for non-matching events', () => {
    const client = new MockBonfireClient();
    const handler = vi.fn();

    renderWithProvider(() => useBonfireEvent('player:joined', handler), client);

    act(() => {
      client.simulateGameEvent({ type: 'player:left', payload: { playerId: 'p1' } });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clean up listener on unmount', () => {
    const client = new MockBonfireClient();
    const handler = vi.fn();

    const { unmount } = renderWithProvider(
      () => useBonfireEvent('test-event', handler),
      client
    );

    unmount();

    act(() => {
      client.simulateGameEvent({ type: 'test-event', payload: 'after unmount' });
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
