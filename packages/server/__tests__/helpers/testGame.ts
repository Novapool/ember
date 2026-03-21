/**
 * Test game implementation for unit tests
 */

import { SocialGame, type GameState, type GameConfig, type RoomId, type PlayerAction } from '@bonfire-ember/core'
import type { SocketStateSynchronizer } from '../../src/core/SocketStateSynchronizer'

/**
 * Simple test game state
 */
export interface TestGameState extends GameState {
  testData?: string
}

/**
 * Simple test game for unit testing
 */
export class TestGame extends SocialGame<TestGameState> {
  config: GameConfig = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['waiting', 'playing', 'ended'],
    allowJoinInProgress: false,
    disconnectTimeout: 30000,
  }

  constructor(roomId: RoomId, synchronizer: SocketStateSynchronizer<TestGameState>) {
    const initialState: TestGameState = {
      roomId,
      phase: 'waiting',
      players: [],
    }
    super(roomId, initialState, synchronizer)
  }

  protected onStart(): void {
    // No-op for test
  }

  protected onEnd(): void {
    // No-op for test
  }

  protected async onPlayerJoin(player: import('@bonfire-ember/core').Player): Promise<void> {
    // No-op for test
  }

  protected async onPlayerLeave(playerId: import('@bonfire-ember/core').PlayerId): Promise<void> {
    // No-op for test
  }

  protected async onGameStart(): Promise<void> {
    // Change phase to 'playing' when game starts
    this.state.phase = 'playing'
  }

  protected async onGameEnd(): Promise<void> {
    // Change phase to 'ended' when game ends
    this.state.phase = 'ended'
  }

  async handleAction(_action: PlayerAction): Promise<any> {
    return { success: false, error: 'Not implemented', code: 'NOT_IMPLEMENTED' }
  }
}

/**
 * Factory function for creating test games
 */
export function createTestGame(
  roomId: RoomId,
  synchronizer: SocketStateSynchronizer<TestGameState>
): TestGame {
  return new TestGame(roomId, synchronizer)
}
