/**
 * Integration test - Full game lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestGame,
  MockStateSynchronizer,
  createTestPlayer,
  createTestState,
} from './helpers';
import type { GameState } from '../src/types';

describe('Integration: Full Game Lifecycle', () => {
  let game: TestGame;
  let synchronizer: MockStateSynchronizer<GameState>;

  beforeEach(() => {
    vi.useFakeTimers();
    synchronizer = new MockStateSynchronizer<GameState>();
    const initialState = createTestState();
    game = new TestGame('integration-room', initialState, { disconnectTimeout: 2000 }, synchronizer);
  });

  afterEach(async () => {
    await game.closeRoom();
    vi.restoreAllMocks();
  });

  it('should handle complete game flow', async () => {
    // 1. Players join
    const alice = createTestPlayer({ id: 'alice', name: 'Alice', isHost: true });
    const bob = createTestPlayer({ id: 'bob', name: 'Bob' });
    const charlie = createTestPlayer({ id: 'charlie', name: 'Charlie' });
    const dana = createTestPlayer({ id: 'dana', name: 'Dana' });

    await game.joinPlayer(alice);
    await game.joinPlayer(bob);
    await game.joinPlayer(charlie);
    await game.joinPlayer(dana);

    expect(game.getPlayers()).toHaveLength(4);
    expect(game.getRoomStatus()).toBe('waiting');
    expect(game.onPlayerJoinCalls).toHaveLength(4);

    // 2. Start game
    expect(game.canStart()).toBe(true);
    const startResult = await game.startGame();
    expect(startResult.success).toBe(true);
    expect(game.getRoomStatus()).toBe('playing');
    expect(game.onGameStartCalls).toBe(1);

    // 3. Transition phases
    const state = game.getState();
    expect(state.phase).toBe('lobby');

    // Access protected method via extending class
    await (game as any).transitionPhase('playing');
    expect(game.getCurrentPhase()).toBe('playing');
    expect(game.onPhaseChangeCalls).toHaveLength(1);

    await (game as any).transitionPhase('results');
    expect(game.getCurrentPhase()).toBe('results');
    expect(game.onPhaseChangeCalls).toHaveLength(2);

    // 4. End game
    const endResult = await game.endGame();
    expect(endResult.success).toBe(true);
    expect(game.getRoomStatus()).toBe('ended');
    expect(game.onGameEndCalls).toBe(1);

    // 5. Verify all events were emitted
    const eventCalls = synchronizer.broadcastEventCalls;
    const eventTypes = eventCalls.map((call) => call.event);

    expect(eventTypes).toContain('player:joined');
    expect(eventTypes).toContain('game:started');
    expect(eventTypes).toContain('phase:changed');
    expect(eventTypes).toContain('game:ended');
  });

  it('should handle multiplayer with disconnect/reconnect', async () => {
    // 1. Four players join
    const players = [
      createTestPlayer({ id: 'p1', name: 'Player 1', isHost: true }),
      createTestPlayer({ id: 'p2', name: 'Player 2' }),
      createTestPlayer({ id: 'p3', name: 'Player 3' }),
      createTestPlayer({ id: 'p4', name: 'Player 4' }),
    ];

    for (const player of players) {
      await game.joinPlayer(player);
    }

    expect(game.getPlayers()).toHaveLength(4);

    // 2. Start game
    await game.startGame();
    expect(game.getRoomStatus()).toBe('playing');

    // 3. Player 2 disconnects
    await game.disconnectPlayer('p2');
    let player2 = game.getPlayer('p2');
    expect(player2?.isConnected).toBe(false);
    expect(game.getPlayers()).toHaveLength(4); // Still in game

    // 4. Player 2 reconnects before timeout
    vi.advanceTimersByTime(1000); // Half of timeout
    await game.reconnectPlayer('p2');
    player2 = game.getPlayer('p2');
    expect(player2?.isConnected).toBe(true);

    vi.advanceTimersByTime(2000); // Past original timeout
    await vi.runAllTimersAsync();
    expect(game.getPlayers()).toHaveLength(4); // Player 2 still in game

    // 5. Player 3 disconnects and times out
    await game.disconnectPlayer('p3');
    vi.advanceTimersByTime(2000); // Full timeout
    await vi.runAllTimersAsync();

    expect(game.getPlayers()).toHaveLength(3); // Player 3 removed
    expect(game.getPlayer('p3')).toBeUndefined();
    expect(game.onPlayerLeaveCalls).toContain('p3');

    // 6. Player 1 leaves manually
    await game.leavePlayer('p1');
    expect(game.getPlayers()).toHaveLength(2);

    // 7. Verify final state
    const remainingPlayers = game.getPlayers();
    expect(remainingPlayers.map((p) => p.id)).toEqual(['p2', 'p4']);
  });

  it('should enforce game rules throughout lifecycle', async () => {
    // Can't start with no players
    let result = await game.startGame();
    expect(result.success).toBe(false);

    // Add one player (not enough)
    await game.joinPlayer(createTestPlayer({ id: 'p1' }));
    result = await game.startGame();
    expect(result.success).toBe(false);

    // Add second player (minimum met)
    await game.joinPlayer(createTestPlayer({ id: 'p2' }));
    result = await game.startGame();
    expect(result.success).toBe(true);

    // Can't start again
    result = await game.startGame();
    expect(result.success).toBe(false);

    // Can't join after start (allowJoinInProgress: false)
    result = await game.joinPlayer(createTestPlayer({ id: 'p3' }));
    expect(result.success).toBe(false);

    // Can end started game
    result = await game.endGame();
    expect(result.success).toBe(true);

    // Can't end again
    result = await game.endGame();
    expect(result.success).toBe(false);
  });

  it('should handle rapid player actions', async () => {
    // Join multiple players simultaneously
    const joinPromises = [
      game.joinPlayer(createTestPlayer({ id: 'p1' })),
      game.joinPlayer(createTestPlayer({ id: 'p2' })),
      game.joinPlayer(createTestPlayer({ id: 'p3' })),
      game.joinPlayer(createTestPlayer({ id: 'p4' })),
    ];

    const results = await Promise.all(joinPromises);
    const successfulJoins = results.filter((r) => r.success);
    expect(successfulJoins).toHaveLength(4);
    expect(game.getPlayers()).toHaveLength(4);

    // Start game
    await game.startGame();

    // Disconnect/reconnect multiple players
    await game.disconnectPlayer('p1');
    await game.disconnectPlayer('p2');
    await game.reconnectPlayer('p1');

    const p1 = game.getPlayer('p1');
    const p2 = game.getPlayer('p2');
    expect(p1?.isConnected).toBe(true);
    expect(p2?.isConnected).toBe(false);

    // Advance time for p2 timeout
    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    expect(game.getPlayers()).toHaveLength(3);
    expect(game.getPlayer('p2')).toBeUndefined();
  });

  it('should maintain state consistency', async () => {
    // Track all state broadcasts (deep clone to capture snapshot)
    const stateSnapshots: GameState[] = [];
    game.on('player:joined', () => {
      stateSnapshots.push(JSON.parse(JSON.stringify(game.getState())));
    });

    // Perform various operations
    await game.joinPlayer(createTestPlayer({ id: 'p1' }));
    await game.joinPlayer(createTestPlayer({ id: 'p2' }));
    await game.startGame();
    await game.leavePlayer('p1');

    // Verify state snapshots are consistent
    expect(stateSnapshots[0].players).toHaveLength(1);
    expect(stateSnapshots[1].players).toHaveLength(2);

    // Verify current state is valid
    const finalState = game.getState();
    expect(finalState.players).toHaveLength(1);
    expect(finalState.startedAt).toBeDefined();
    expect(finalState.endedAt).toBeUndefined();
  });

  it('should cleanup properly on room close', async () => {
    // Add players with disconnect timers
    await game.joinPlayer(createTestPlayer({ id: 'p1' }));
    await game.joinPlayer(createTestPlayer({ id: 'p2' }));
    await game.disconnectPlayer('p1');

    const eventHandler = vi.fn();
    game.on('player:joined', eventHandler);

    // Close room
    await game.closeRoom();

    expect(game.getRoomStatus()).toBe('closed');

    // Try to trigger timeout (should not fire after cleanup)
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    // Event listeners should be removed
    await game.joinPlayer(createTestPlayer({ id: 'p3' }));
    expect(eventHandler).not.toHaveBeenCalled();
  });
});

describe('Integration: allowJoinInProgress', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows players to join after game starts when allowJoinInProgress is true', async () => {
    const synchronizer = new MockStateSynchronizer<GameState>();
    const initialState = createTestState();
    const game = new TestGame(
      'open-room',
      initialState,
      { allowJoinInProgress: true },
      synchronizer
    );

    const host = createTestPlayer({ id: 'host', isHost: true });
    const p2 = createTestPlayer({ id: 'p2' });
    await game.joinPlayer(host);
    await game.joinPlayer(p2);

    const startResult = await game.startGame();
    expect(startResult.success).toBe(true);
    expect(game.getRoomStatus()).toBe('playing');

    // A third player joins mid-game
    const p3 = createTestPlayer({ id: 'p3', name: 'Late Joiner' });
    const joinResult = await game.joinPlayer(p3);
    expect(joinResult.success).toBe(true);
    expect(game.getPlayers()).toHaveLength(3);
    expect(game.getPlayer('p3')).toBeDefined();

    await game.closeRoom();
  });

  it('rejects mid-game joins when allowJoinInProgress is false (default)', async () => {
    const synchronizer = new MockStateSynchronizer<GameState>();
    const initialState = createTestState();
    const game = new TestGame(
      'closed-room',
      initialState,
      { allowJoinInProgress: false },
      synchronizer
    );

    const host = createTestPlayer({ id: 'host', isHost: true });
    const p2 = createTestPlayer({ id: 'p2' });
    await game.joinPlayer(host);
    await game.joinPlayer(p2);
    await game.startGame();

    const p3 = createTestPlayer({ id: 'p3' });
    const joinResult = await game.joinPlayer(p3);
    expect(joinResult.success).toBe(false);
    expect(game.getPlayers()).toHaveLength(2);

    await game.closeRoom();
  });
});
