import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useEmberEvent } from '../../src/hooks/useEmberEvent';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';

describe('useEmberEvent', () => {
  it('should call handler when matching event fires', () => {
    const client = new MockEmberClient();
    const handler = vi.fn();

    renderWithProvider(() => useEmberEvent('player:joined', handler), client);

    act(() => {
      client.simulateGameEvent({ type: 'player:joined', payload: { name: 'Alice' } });
    });

    expect(handler).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('should not call handler for non-matching events', () => {
    const client = new MockEmberClient();
    const handler = vi.fn();

    renderWithProvider(() => useEmberEvent('player:joined', handler), client);

    act(() => {
      client.simulateGameEvent({ type: 'player:left', payload: { playerId: 'p1' } });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clean up listener on unmount', () => {
    const client = new MockEmberClient();
    const handler = vi.fn();

    const { unmount } = renderWithProvider(
      () => useEmberEvent('test-event', handler),
      client
    );

    unmount();

    act(() => {
      client.simulateGameEvent({ type: 'test-event', payload: 'after unmount' });
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
