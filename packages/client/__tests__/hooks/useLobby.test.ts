import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useLobby } from '../../src/hooks/useLobby';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';
import type { GameState } from '@bonfire/core';

const hostState: GameState = {
  roomId: 'ABC123',
  phase: 'lobby',
  players: [
    { id: 'host-1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
    { id: 'player-2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2000 },
  ],
  metadata: { roomCode: 'ABC123', config: { minPlayers: 2, maxPlayers: 6 } },
};

describe('useLobby', () => {
  describe('initial state', () => {
    it('returns empty roomCode and no players when no state', () => {
      const { result } = renderWithProvider(() => useLobby());
      expect(result.current.roomCode).toBe('');
      expect(result.current.players).toEqual([]);
      expect(result.current.isHost).toBe(false);
      expect(result.current.isStarting).toBe(false);
      expect(result.current.copied).toBe(false);
    });

    it('defaults minPlayers to 2 and maxPlayers to 8 when no config', () => {
      const { result } = renderWithProvider(() => useLobby());
      expect(result.current.minPlayers).toBe(2);
      expect(result.current.maxPlayers).toBe(8);
    });
  });

  describe('with game state', () => {
    it('derives roomCode from state metadata', () => {
      const client = new MockEmberClient();
      client.setPlayerId('host-1');
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      expect(result.current.roomCode).toBe('ABC123');
    });

    it('uses overrideRoomCode option over state', () => {
      const client = new MockEmberClient();
      const { result } = renderWithProvider(() => useLobby({ roomCode: 'CUSTOM' }), client);

      act(() => { client.simulateStateUpdate(hostState); });

      expect(result.current.roomCode).toBe('CUSTOM');
    });

    it('reads minPlayers and maxPlayers from state config', () => {
      const client = new MockEmberClient();
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      expect(result.current.minPlayers).toBe(2);
      expect(result.current.maxPlayers).toBe(6);
    });

    it('returns all players', () => {
      const client = new MockEmberClient();
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      expect(result.current.players).toHaveLength(2);
    });

    it('canStart is true for host with enough players', () => {
      const client = new MockEmberClient();
      client.setPlayerId('host-1');
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      expect(result.current.isHost).toBe(true);
      expect(result.current.canStart).toBe(true);
    });

    it('canStart is false for non-host', () => {
      const client = new MockEmberClient();
      client.setPlayerId('player-2');
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      expect(result.current.isHost).toBe(false);
      expect(result.current.canStart).toBe(false);
    });

    it('canStart is false when below minPlayers', () => {
      const client = new MockEmberClient();
      client.setPlayerId('host-1');
      const { result } = renderWithProvider(() => useLobby(), client);

      const singlePlayerState: GameState = {
        ...hostState,
        players: [{ id: 'host-1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 }],
      };

      act(() => { client.simulateStateUpdate(singlePlayerState); });

      expect(result.current.canStart).toBe(false);
    });
  });

  describe('handleStart', () => {
    it('calls startGame when canStart and no onStart provided', async () => {
      const client = new MockEmberClient();
      client.setPlayerId('host-1');
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      await act(async () => { await result.current.handleStart(); });

      expect(client.startGame).toHaveBeenCalledTimes(1);
    });

    it('calls custom onStart instead of startGame when provided', async () => {
      const client = new MockEmberClient();
      client.setPlayerId('host-1');
      const onStart = vi.fn().mockResolvedValue(undefined);
      const { result } = renderWithProvider(() => useLobby({ onStart }), client);

      act(() => { client.simulateStateUpdate(hostState); });

      await act(async () => { await result.current.handleStart(); });

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(client.startGame).not.toHaveBeenCalled();
    });

    it('does not call startGame when canStart is false', async () => {
      const client = new MockEmberClient();
      client.setPlayerId('player-2'); // non-host
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      await act(async () => { await result.current.handleStart(); });

      expect(client.startGame).not.toHaveBeenCalled();
    });

    it('sets isStarting to true during async onStart', async () => {
      const client = new MockEmberClient();
      client.setPlayerId('host-1');

      let resolveStart!: () => void;
      const onStart = () => new Promise<void>((resolve) => { resolveStart = resolve; });

      const { result } = renderWithProvider(() => useLobby({ onStart }), client);

      act(() => { client.simulateStateUpdate(hostState); });

      // Start but don't await
      let startPromise: Promise<void>;
      act(() => { startPromise = result.current.handleStart(); });

      expect(result.current.isStarting).toBe(true);

      await act(async () => { resolveStart(); await startPromise; });

      expect(result.current.isStarting).toBe(false);
    });
  });

  describe('handleCopyCode', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it('copies roomCode to clipboard and sets copied=true', async () => {
      const client = new MockEmberClient();
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      await act(async () => { await result.current.handleCopyCode(); });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123');
      expect(result.current.copied).toBe(true);
    });

    it('resets copied to false after 2 seconds', async () => {
      vi.useFakeTimers();
      const client = new MockEmberClient();
      const { result } = renderWithProvider(() => useLobby(), client);

      act(() => { client.simulateStateUpdate(hostState); });

      await act(async () => { await result.current.handleCopyCode(); });
      expect(result.current.copied).toBe(true);

      act(() => { vi.advanceTimersByTime(2000); });
      expect(result.current.copied).toBe(false);

      vi.useRealTimers();
    });
  });
});
