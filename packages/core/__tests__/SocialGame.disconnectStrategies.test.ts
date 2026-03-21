/**
 * Tests for SocialGame disconnect strategies:
 * - transfer-host: promote next connected player to host when host disconnects
 * - skip-turn: advance currentTurnIndex when the current turn player disconnects
 *
 * Players must be joined via game.joinPlayer() so PlayerManager has them
 * registered before disconnect is called.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestGame,
  MockStateSynchronizer,
  createTestState,
} from './helpers';
import type { GameState, Player } from '../src/types';

/** Helper: join a player with explicit isHost / isConnected flags. */
async function joinAs(
  game: TestGame,
  id: string,
  opts: { isHost?: boolean; isConnected?: boolean } = {}
): Promise<void> {
  const player: Player = {
    id,
    name: `Player ${id}`,
    isHost: opts.isHost ?? false,
    isConnected: opts.isConnected ?? true,
    joinedAt: Date.now(),
  };
  // Bypass the validator's maxPlayers / minPlayers by using a large config
  const result = await game.joinPlayer(player);
  if (!result.success) throw new Error(`joinAs failed: ${result.error}`);
}

describe('SocialGame — disconnect strategies', () => {
  let synchronizer: MockStateSynchronizer<GameState>;

  beforeEach(() => {
    vi.useFakeTimers();
    synchronizer = new MockStateSynchronizer<GameState>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // transfer-host strategy
  // ---------------------------------------------------------------------------

  describe('transfer-host strategy', () => {
    it('should promote the next connected player when the host disconnects', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'transfer-host' },
        synchronizer
      );

      await joinAs(game, 'host', { isHost: true });
      await joinAs(game, 'p2');

      // Manually mark host in state so it matches what we joined
      game.getState().players.find((p) => p.id === 'host')!.isHost = true;

      await game.disconnectPlayer('host');

      expect(game.getPlayer('host')?.isHost).toBe(false);
      expect(game.getPlayer('p2')?.isHost).toBe(true);

      await game.closeRoom();
    });

    it('should not transfer host when a non-host disconnects', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'transfer-host' },
        synchronizer
      );

      await joinAs(game, 'host', { isHost: true });
      await joinAs(game, 'p2');

      // Mark host properly
      game.getState().players.find((p) => p.id === 'host')!.isHost = true;

      // Disconnect non-host p2
      await game.disconnectPlayer('p2');

      expect(game.getPlayer('host')?.isHost).toBe(true);
      expect(game.getPlayer('p2')?.isHost).toBe(false);

      await game.closeRoom();
    });

    it('should skip disconnected players when choosing next host', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'transfer-host' },
        synchronizer
      );

      await joinAs(game, 'host', { isHost: true });
      await joinAs(game, 'p2');
      await joinAs(game, 'p3');

      // Mark host and pre-disconnect p2 so it is skipped
      game.getState().players.find((p) => p.id === 'host')!.isHost = true;
      game.getState().players.find((p) => p.id === 'p2')!.isConnected = false;

      await game.disconnectPlayer('host');

      // p2 is already disconnected; p3 should be promoted
      expect(game.getPlayer('p2')?.isHost).toBe(false);
      expect(game.getPlayer('p3')?.isHost).toBe(true);

      await game.closeRoom();
    });

    it('should not crash when no connected players remain to promote', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'transfer-host' },
        synchronizer
      );

      await joinAs(game, 'host', { isHost: true });
      await joinAs(game, 'p2');

      // Mark host and mark p2 as already disconnected
      game.getState().players.find((p) => p.id === 'host')!.isHost = true;
      game.getState().players.find((p) => p.id === 'p2')!.isConnected = false;

      // Should succeed even though there is no connected player to promote
      const result = await game.disconnectPlayer('host');
      expect(result.success).toBe(true);

      await game.closeRoom();
    });

    it('should mark host as disconnected (isConnected = false) after the transfer', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'transfer-host' },
        synchronizer
      );

      await joinAs(game, 'host', { isHost: true });
      await joinAs(game, 'p2');

      game.getState().players.find((p) => p.id === 'host')!.isHost = true;

      await game.disconnectPlayer('host');

      expect(game.getPlayer('host')?.isConnected).toBe(false);

      await game.closeRoom();
    });
  });

  // ---------------------------------------------------------------------------
  // skip-turn strategy
  // ---------------------------------------------------------------------------

  describe('skip-turn strategy', () => {
    it('should advance turn when the current turn player disconnects', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'skip-turn' },
        synchronizer
      );

      await joinAs(game, 'p1');
      await joinAs(game, 'p2');
      await joinAs(game, 'p3');

      // Set up playerOrder and currentTurnIndex directly
      const state = game.getState() as GameState;
      state.playerOrder = ['p1', 'p2', 'p3'];
      state.currentTurnIndex = 0; // p1's turn

      // Sync the internal state by using updateState
      await game.testUpdateState({ playerOrder: ['p1', 'p2', 'p3'], currentTurnIndex: 0 });

      await game.disconnectPlayer('p1');

      expect(game.getState().currentTurnIndex).toBe(1);

      await game.closeRoom();
    });

    it('should wrap around to index 0 when the last player in order disconnects', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'skip-turn' },
        synchronizer
      );

      await joinAs(game, 'p1');
      await joinAs(game, 'p2');
      await joinAs(game, 'p3');

      await game.testUpdateState({ playerOrder: ['p1', 'p2', 'p3'], currentTurnIndex: 2 }); // p3's turn

      await game.disconnectPlayer('p3');

      // Should wrap to p1 at index 0
      expect(game.getState().currentTurnIndex).toBe(0);

      await game.closeRoom();
    });

    it('should not change turn when a non-current-turn player disconnects', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'skip-turn' },
        synchronizer
      );

      await joinAs(game, 'p1');
      await joinAs(game, 'p2');
      await joinAs(game, 'p3');

      await game.testUpdateState({ playerOrder: ['p1', 'p2', 'p3'], currentTurnIndex: 0 }); // p1's turn

      // p2 disconnects — not their turn
      await game.disconnectPlayer('p2');

      expect(game.getState().currentTurnIndex).toBe(0);

      await game.closeRoom();
    });

    it('should not change turn when playerOrder is absent', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'skip-turn' },
        synchronizer
      );

      await joinAs(game, 'p1');
      await joinAs(game, 'p2');

      // No playerOrder set — skip logic should be a no-op
      const result = await game.disconnectPlayer('p1');

      expect(result.success).toBe(true);
      expect(game.getState().currentTurnIndex).toBeUndefined();

      await game.closeRoom();
    });

    it('should not change turn when currentTurnIndex is absent', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'skip-turn' },
        synchronizer
      );

      await joinAs(game, 'p1');
      await joinAs(game, 'p2');

      // playerOrder present but currentTurnIndex absent
      await game.testUpdateState({ playerOrder: ['p1', 'p2'] });

      const result = await game.disconnectPlayer('p1');

      expect(result.success).toBe(true);
      expect(game.getState().currentTurnIndex).toBeUndefined();

      await game.closeRoom();
    });

    it('should skip already-disconnected players when advancing turn', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'skip-turn' },
        synchronizer
      );

      await joinAs(game, 'p1');
      await joinAs(game, 'p2');
      await joinAs(game, 'p3');

      await game.testUpdateState({ playerOrder: ['p1', 'p2', 'p3'], currentTurnIndex: 0 });

      // Pre-mark p2 as already disconnected
      game.getState().players.find((p) => p.id === 'p2')!.isConnected = false;

      await game.disconnectPlayer('p1');

      // p2 is disconnected, so skip it and land on p3 (index 2)
      expect(game.getState().currentTurnIndex).toBe(2);

      await game.closeRoom();
    });
  });

  // ---------------------------------------------------------------------------
  // reconnect-window strategy (default) — host transfer should NOT fire
  // ---------------------------------------------------------------------------

  describe('reconnect-window strategy (default)', () => {
    it('should not change host when host disconnects under reconnect-window', async () => {
      const game = new TestGame(
        'room-1',
        createTestState(),
        { maxPlayers: 10, disconnectStrategy: 'reconnect-window' },
        synchronizer
      );

      await joinAs(game, 'host', { isHost: true });
      await joinAs(game, 'p2');

      game.getState().players.find((p) => p.id === 'host')!.isHost = true;

      await game.disconnectPlayer('host');

      // Under reconnect-window, host status is not transferred
      expect(game.getPlayer('host')?.isHost).toBe(true);
      expect(game.getPlayer('p2')?.isHost).toBe(false);

      await game.closeRoom();
    });
  });
});
