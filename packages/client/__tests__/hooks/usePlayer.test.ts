import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { usePlayer } from '../../src/hooks/usePlayer';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';
import type { GameState } from '@bonfire-ember/core';

describe('usePlayer', () => {
  it('should return null player and empty players list initially', () => {
    const { result } = renderWithProvider(() => usePlayer());
    expect(result.current.player).toBeNull();
    expect(result.current.playerId).toBeNull();
    expect(result.current.isHost).toBe(false);
    expect(result.current.players).toEqual([]);
  });

  it('should derive current player from state and playerId', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p1');

    const { result } = renderWithProvider(() => usePlayer(), client);

    const state: GameState = {
      roomId: 'ABC123',
      phase: 'lobby',
      players: [
        { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
        { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2000 },
      ],
    };

    act(() => {
      client.simulateStateUpdate(state);
    });

    expect(result.current.player?.name).toBe('Alice');
    expect(result.current.playerId).toBe('p1');
    expect(result.current.isHost).toBe(true);
    expect(result.current.players).toHaveLength(2);
  });

  it('should return isHost=false for non-host player', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p2');

    const { result } = renderWithProvider(() => usePlayer(), client);

    const state: GameState = {
      roomId: 'ABC123',
      phase: 'lobby',
      players: [
        { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
        { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2000 },
      ],
    };

    act(() => {
      client.simulateStateUpdate(state);
    });

    expect(result.current.player?.name).toBe('Bob');
    expect(result.current.isHost).toBe(false);
  });

  it('should return null player if playerId not found in state', () => {
    const client = new MockEmberClient();
    client.setPlayerId('unknown');

    const { result } = renderWithProvider(() => usePlayer(), client);

    const state: GameState = {
      roomId: 'ABC123',
      phase: 'lobby',
      players: [
        { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
      ],
    };

    act(() => {
      client.simulateStateUpdate(state);
    });

    expect(result.current.player).toBeNull();
    expect(result.current.isHost).toBe(false);
  });
});
