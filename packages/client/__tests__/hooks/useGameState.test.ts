import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useGameState } from '../../src/hooks/useGameState';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';
import type { GameState } from '@bonfire/core';

describe('useGameState', () => {
  it('should return null state initially', () => {
    const { result } = renderWithProvider(() => useGameState());
    expect(result.current.state).toBeNull();
  });

  it('should update when state changes', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useGameState(), client);

    const state: GameState = {
      roomId: 'ABC123',
      phase: 'lobby',
      players: [{ id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 }],
    };

    act(() => {
      client.simulateStateUpdate(state);
    });

    expect(result.current.state).toEqual(state);
  });

  it('should support custom state fields via type assertion', () => {
    interface MyState extends GameState {
      customField: string;
    }

    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useGameState(), client);

    const state = {
      roomId: 'ABC123',
      phase: 'lobby',
      players: [],
      customField: 'hello',
    } as MyState;

    act(() => {
      client.simulateStateUpdate(state);
    });

    const myState = result.current.state as MyState;
    expect(myState?.customField).toBe('hello');
  });

  it('should call requestState on the client', async () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useGameState(), client);

    await act(async () => {
      await result.current.requestState();
    });

    expect(client.requestState).toHaveBeenCalled();
  });
});
