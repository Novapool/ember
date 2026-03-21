/**
 * Test utilities and mocks
 */

import { SocialGame } from '../src/SocialGame';
import type {
  GameState,
  GameConfig,
  Player,
  PlayerId,
  PlayerAction,
  ActionResult,
  PhaseTransition,
  Phase,
} from '../src/types';
import type { IStateSynchronizer } from '../src/state/IStateSynchronizer';

/**
 * Mock state synchronizer for testing
 */
export class MockStateSynchronizer<TState extends GameState>
  implements IStateSynchronizer<TState>
{
  public broadcastStateCalls: TState[] = [];
  public sendToPlayerCalls: Array<{ playerId: PlayerId; state: TState }> = [];
  public broadcastEventCalls: Array<{ event: string; payload: unknown }> = [];
  public broadcastCustomEventCalls: Array<{ type: string; payload: unknown }> = [];

  async broadcastState(state: TState): Promise<void> {
    this.broadcastStateCalls.push(state);
  }

  async sendToPlayer(playerId: PlayerId, state: TState): Promise<void> {
    this.sendToPlayerCalls.push({ playerId, state });
  }

  async broadcastEvent(event: string, payload: unknown): Promise<void> {
    this.broadcastEventCalls.push({ event, payload });
  }

  async broadcastCustomEvent(type: string, payload: unknown): Promise<void> {
    this.broadcastCustomEventCalls.push({ type, payload });
  }

  reset(): void {
    this.broadcastStateCalls = [];
    this.sendToPlayerCalls = [];
    this.broadcastEventCalls = [];
    this.broadcastCustomEventCalls = [];
  }
}

/**
 * Create a test player with default values
 */
export function createTestPlayer(overrides?: Partial<Player>): Player {
  const id = overrides?.id ?? `player-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: overrides?.name ?? `Player ${id}`,
    isHost: overrides?.isHost ?? false,
    isConnected: overrides?.isConnected ?? true,
    joinedAt: overrides?.joinedAt ?? Date.now(),
    metadata: overrides?.metadata,
  };
}

/**
 * Create a test game state
 */
export function createTestState(overrides?: Partial<GameState>): GameState {
  return {
    roomId: overrides?.roomId ?? 'test-room',
    phase: overrides?.phase ?? 'lobby',
    players: overrides?.players ?? [],
    startedAt: overrides?.startedAt,
    endedAt: overrides?.endedAt,
    metadata: overrides?.metadata,
    playerOrder: overrides?.playerOrder,
    currentTurnIndex: overrides?.currentTurnIndex,
  };
}

/**
 * Create a test game config
 */
export function createTestConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    minPlayers: overrides?.minPlayers ?? 2,
    maxPlayers: overrides?.maxPlayers ?? 8,
    phases: overrides?.phases ?? ['lobby', 'playing', 'results'],
    allowJoinInProgress: overrides?.allowJoinInProgress ?? false,
    disconnectTimeout: overrides?.disconnectTimeout ?? 1000, // Short timeout for tests
    disconnectStrategy: overrides?.disconnectStrategy,
  };
}

/**
 * Minimal test game implementation
 */
export class TestGame extends SocialGame<GameState> {
  config: GameConfig;

  // Track hook calls
  onPlayerJoinCalls: Player[] = [];
  onPlayerLeaveCalls: PlayerId[] = [];
  onGameStartCalls: number = 0;
  onGameEndCalls: number = 0;
  onPhaseChangeCalls: PhaseTransition[] = [];

  constructor(
    roomId: string,
    initialState: GameState,
    config?: Partial<GameConfig>,
    synchronizer?: IStateSynchronizer<GameState> | null
  ) {
    super(roomId, initialState, synchronizer);
    this.config = createTestConfig(config);
  }

  async onPlayerJoin(player: Player): Promise<void> {
    this.onPlayerJoinCalls.push(player);
  }

  async onPlayerLeave(playerId: PlayerId): Promise<void> {
    this.onPlayerLeaveCalls.push(playerId);
  }

  async onGameStart(): Promise<void> {
    this.onGameStartCalls++;
  }

  async onGameEnd(): Promise<void> {
    this.onGameEndCalls++;
  }

  async onPhaseChange(transition: PhaseTransition): Promise<void> {
    this.onPhaseChangeCalls.push(transition);
  }

  async handleAction<T = unknown>(action: PlayerAction<T>): Promise<ActionResult> {
    return { success: true };
  }

  // Expose protected broadcastEvent for testing
  async testBroadcastEvent(type: string, payload: unknown): Promise<void> {
    return this.broadcastEvent(type, payload);
  }

  // Expose protected transitionPhase for testing
  async testTransitionPhase(nextPhase: Phase): Promise<void> {
    return this.transitionPhase(nextPhase);
  }

  // Expose protected updateState for testing
  async testUpdateState(updates: Partial<GameState>): Promise<void> {
    return this.updateState(updates);
  }
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
