import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { usePhase } from '../../src/hooks/usePhase';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';
import type { GameState } from '@bonfire/core';

describe('usePhase', () => {
  it('should return null phase initially', () => {
    const { result } = renderWithProvider(() => usePhase());
    expect(result.current).toBeNull();
  });

  it('should return current phase from state', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => usePhase(), client);

    const state: GameState = {
      roomId: 'ABC123',
      phase: 'voting',
      players: [],
    };

    act(() => {
      client.simulateStateUpdate(state);
    });

    expect(result.current).toBe('voting');
  });

  it('should allow direct phase comparison', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => usePhase(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ABC123',
        phase: 'voting',
        players: [],
      });
    });

    expect(result.current === 'voting').toBe(true);
    expect(result.current === 'lobby').toBe(false);
    expect(result.current === 'reveal').toBe(false);
  });

  it('should update phase when state changes', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => usePhase(), client);

    act(() => {
      client.simulateStateUpdate({ roomId: 'A', phase: 'lobby', players: [] });
    });
    expect(result.current).toBe('lobby');

    act(() => {
      client.simulateStateUpdate({ roomId: 'A', phase: 'playing', players: [] });
    });
    expect(result.current).toBe('playing');
  });
});
