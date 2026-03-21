/**
 * Tests for the abstract Game base class.
 *
 * Game is abstract so we use TestGame (from helpers) which extends SocialGame
 * which extends Game. We test the base class methods directly because they are
 * the lowest-level contracts that all game implementations rely on.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TestGame,
  createTestPlayer,
  createTestState,
  createTestConfig,
} from './helpers';
import type { GameState } from '../src/types';

describe('Game (base class)', () => {
  describe('getState', () => {
    it('should return a copy of the current state', () => {
      const initialState = createTestState({ roomId: 'room-abc' });
      const game = new TestGame('room-abc', initialState, {}, null);

      const state = game.getState();
      expect(state.roomId).toBe('room-abc');
      // Modifying the returned copy should not affect internal state
      (state as GameState).phase = 'hacked';
      expect(game.getState().phase).toBe('lobby');

      game.closeRoom();
    });
  });

  describe('getCurrentPhase', () => {
    it('should return the current phase', () => {
      const game = new TestGame('room-1', createTestState({ phase: 'playing' }), {}, null);
      expect(game.getCurrentPhase()).toBe('playing');
      game.closeRoom();
    });
  });

  describe('getPlayers', () => {
    it('should return a copy of the players array', async () => {
      const game = new TestGame('room-1', createTestState(), {}, null);
      await game.joinPlayer(createTestPlayer({ id: 'p1' }));

      const players = game.getPlayers();
      expect(players).toHaveLength(1);
      // Mutating returned array should not affect internal state
      players.pop();
      expect(game.getPlayers()).toHaveLength(1);

      game.closeRoom();
    });
  });

  describe('getPlayer', () => {
    it('should find player by id', async () => {
      const game = new TestGame('room-1', createTestState(), {}, null);
      const p = createTestPlayer({ id: 'p1', name: 'Alice' });
      await game.joinPlayer(p);

      const found = game.getPlayer('p1');
      expect(found?.name).toBe('Alice');

      game.closeRoom();
    });

    it('should return undefined for unknown id', () => {
      const game = new TestGame('room-1', createTestState(), {}, null);
      expect(game.getPlayer('unknown')).toBeUndefined();
      game.closeRoom();
    });
  });

  describe('canPlayerJoin', () => {
    it('should return true when there is room and game has not started', () => {
      const game = new TestGame('room-1', createTestState(), { maxPlayers: 4 }, null);
      expect(game.canPlayerJoin()).toBe(true);
      game.closeRoom();
    });

    it('should return false when the room is at capacity', async () => {
      const game = new TestGame('room-1', createTestState(), { maxPlayers: 2 }, null);
      await game.joinPlayer(createTestPlayer({ id: 'p1' }));
      await game.joinPlayer(createTestPlayer({ id: 'p2' }));
      expect(game.canPlayerJoin()).toBe(false);
      game.closeRoom();
    });

    it('should return false when game has started and allowJoinInProgress is false', async () => {
      const game = new TestGame(
        'room-1',
        createTestState({ startedAt: Date.now() }),
        { allowJoinInProgress: false },
        null
      );
      expect(game.canPlayerJoin()).toBe(false);
      game.closeRoom();
    });

    it('should return true when game has started and allowJoinInProgress is true', async () => {
      const game = new TestGame(
        'room-1',
        createTestState({ startedAt: Date.now() }),
        { allowJoinInProgress: true, maxPlayers: 8 },
        null
      );
      expect(game.canPlayerJoin()).toBe(true);
      game.closeRoom();
    });
  });

  describe('canStart', () => {
    it('should return false when there are not enough players', () => {
      const game = new TestGame('room-1', createTestState(), { minPlayers: 2 }, null);
      expect(game.canStart()).toBe(false);
      game.closeRoom();
    });

    it('should return true when there are enough players and game has not started', async () => {
      const game = new TestGame('room-1', createTestState(), { minPlayers: 2 }, null);
      await game.joinPlayer(createTestPlayer({ id: 'p1' }));
      await game.joinPlayer(createTestPlayer({ id: 'p2' }));
      expect(game.canStart()).toBe(true);
      game.closeRoom();
    });

    it('should return false when game has already started', async () => {
      const game = new TestGame(
        'room-1',
        createTestState({
          players: [createTestPlayer({ id: 'p1' }), createTestPlayer({ id: 'p2' })],
          startedAt: Date.now(),
        }),
        { minPlayers: 2 },
        null
      );
      expect(game.canStart()).toBe(false);
      game.closeRoom();
    });
  });
});
