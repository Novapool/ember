/**
 * In-memory database adapter for testing
 *
 * This adapter stores data in memory using Maps, making it perfect for
 * unit tests and development without requiring an actual database.
 */

import type { GameState, RoomId } from '@bonfire-ember/core'
import type { RoomMetadata } from '../types'
import type { IDatabaseAdapter } from './IDatabaseAdapter'

/**
 * In-memory database adapter
 *
 * Warning: All data is lost when the process exits.
 * Only use for testing and development.
 */
export class InMemoryAdapter implements IDatabaseAdapter {
  private gameStates: Map<RoomId, GameState> = new Map()
  private roomMetadata: Map<RoomId, RoomMetadata> = new Map()

  async initialize(): Promise<void> {
    // No-op for in-memory implementation
  }

  async saveGameState(roomId: RoomId, state: GameState): Promise<void> {
    this.gameStates.set(roomId, state)
  }

  async loadGameState(roomId: RoomId): Promise<GameState | null> {
    return this.gameStates.get(roomId) ?? null
  }

  async deleteRoom(roomId: RoomId): Promise<void> {
    this.gameStates.delete(roomId)
    this.roomMetadata.delete(roomId)
  }

  async updateRoomMetadata(roomId: RoomId, metadata: RoomMetadata): Promise<void> {
    this.roomMetadata.set(roomId, metadata)
  }

  async getRoomMetadata(roomId: RoomId): Promise<RoomMetadata | null> {
    return this.roomMetadata.get(roomId) ?? null
  }

  async getAllRoomMetadata(): Promise<RoomMetadata[]> {
    return Array.from(this.roomMetadata.values())
  }

  async getInactiveRooms(olderThan: number): Promise<RoomId[]> {
    const inactiveRooms: RoomId[] = []

    for (const [roomId, metadata] of this.roomMetadata.entries()) {
      if (metadata.lastActivity < olderThan) {
        inactiveRooms.push(roomId)
      }
    }

    return inactiveRooms
  }

  async roomExists(roomId: RoomId): Promise<boolean> {
    return this.gameStates.has(roomId)
  }

  async close(): Promise<void> {
    this.gameStates.clear()
    this.roomMetadata.clear()
  }

  /**
   * Clear all data (useful for tests)
   */
  clear(): void {
    this.gameStates.clear()
    this.roomMetadata.clear()
  }

  /**
   * Get number of stored rooms (useful for tests)
   */
  getRoomCount(): number {
    return this.gameStates.size
  }
}
