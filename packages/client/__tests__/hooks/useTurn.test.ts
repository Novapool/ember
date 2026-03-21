import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useTurn } from '../../src/hooks/useTurn';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';
import type { GameState } from '@bonfire-ember/core';

describe('useTurn', () => {
  it('returns all-null values when there is no game state', () => {
    const { result } = renderWithProvider(() => useTurn());
    expect(result.current.isMyTurn).toBe(false);
    expect(result.current.currentPlayerId).toBeNull();
    expect(result.current.currentPlayer).toBeNull();
    expect(result.current.turnIndex).toBeNull();
  });

  it('returns turnIndex null when state has no currentTurnIndex', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [
          { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
        ],
        playerOrder: ['p1'],
        // no currentTurnIndex
      });
    });

    expect(result.current.turnIndex).toBeNull();
    expect(result.current.currentPlayerId).toBeNull();
    expect(result.current.currentPlayer).toBeNull();
  });

  it('returns turnIndex null when state has no playerOrder', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [
          { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
        ],
        currentTurnIndex: 0,
        // no playerOrder
      });
    });

    expect(result.current.turnIndex).toBe(0);
    expect(result.current.currentPlayerId).toBeNull();
    expect(result.current.currentPlayer).toBeNull();
  });

  it('resolves the correct currentPlayer for turn 0', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p2');
    const { result } = renderWithProvider(() => useTurn(), client);

    const state: GameState = {
      roomId: 'ROOM1',
      phase: 'playing',
      players: [
        { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
        { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2 },
        { id: 'p3', name: 'Carol', isHost: false, isConnected: true, joinedAt: 3 },
      ],
      playerOrder: ['p1', 'p2', 'p3'],
      currentTurnIndex: 0,
    };

    act(() => {
      client.simulateStateUpdate(state);
    });

    expect(result.current.turnIndex).toBe(0);
    expect(result.current.currentPlayerId).toBe('p1');
    expect(result.current.currentPlayer?.name).toBe('Alice');
    expect(result.current.isMyTurn).toBe(false);
  });

  it('resolves the correct currentPlayer for a mid-game turn', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p2');
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [
          { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
          { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2 },
          { id: 'p3', name: 'Carol', isHost: false, isConnected: true, joinedAt: 3 },
        ],
        playerOrder: ['p1', 'p2', 'p3'],
        currentTurnIndex: 1,
      });
    });

    expect(result.current.turnIndex).toBe(1);
    expect(result.current.currentPlayerId).toBe('p2');
    expect(result.current.currentPlayer?.name).toBe('Bob');
  });

  it('isMyTurn is true when the local player is the current turn player', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p2');
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [
          { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
          { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2 },
        ],
        playerOrder: ['p1', 'p2'],
        currentTurnIndex: 1,
      });
    });

    expect(result.current.isMyTurn).toBe(true);
  });

  it('isMyTurn is false when another player is the current turn player', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p2');
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [
          { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
          { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2 },
        ],
        playerOrder: ['p1', 'p2'],
        currentTurnIndex: 0,
      });
    });

    expect(result.current.isMyTurn).toBe(false);
    expect(result.current.currentPlayerId).toBe('p1');
  });

  it('returns null currentPlayerId when currentTurnIndex is out-of-bounds', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [
          { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
        ],
        playerOrder: ['p1'],
        currentTurnIndex: 99, // out of bounds
      });
    });

    expect(result.current.turnIndex).toBe(99);
    expect(result.current.currentPlayerId).toBeNull();
    expect(result.current.currentPlayer).toBeNull();
    expect(result.current.isMyTurn).toBe(false);
  });

  it('isMyTurn is false when there is no local playerId', () => {
    const client = new MockEmberClient();
    // no setPlayerId call → playerId remains null
    const { result } = renderWithProvider(() => useTurn(), client);

    act(() => {
      client.simulateStateUpdate({
        roomId: 'ROOM1',
        phase: 'playing',
        players: [{ id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 }],
        playerOrder: ['p1'],
        currentTurnIndex: 0,
      });
    });

    expect(result.current.isMyTurn).toBe(false);
  });

  it('updates reactively when turn advances', () => {
    const client = new MockEmberClient();
    client.setPlayerId('p1');
    const { result } = renderWithProvider(() => useTurn(), client);

    const players = [
      { id: 'p1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1 },
      { id: 'p2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2 },
    ];
    const playerOrder = ['p1', 'p2'];

    act(() => {
      client.simulateStateUpdate({ roomId: 'R', phase: 'playing', players, playerOrder, currentTurnIndex: 0 });
    });
    expect(result.current.isMyTurn).toBe(true);

    act(() => {
      client.simulateStateUpdate({ roomId: 'R', phase: 'playing', players, playerOrder, currentTurnIndex: 1 });
    });
    expect(result.current.isMyTurn).toBe(false);
    expect(result.current.currentPlayerId).toBe('p2');
  });
});
