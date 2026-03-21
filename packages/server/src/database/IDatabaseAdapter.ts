/**
 * Database adapter interface for backend-agnostic persistence
 *
 * This abstraction allows switching between different database backends
 * (Firebase, PostgreSQL, Redis, etc.) without changing game logic.
 */

import type { GameState, RoomId } from '@bonfire-ember/core'
import type { RoomMetadata } from '../types'

/**
 * Database adapter interface
 *
 * Implementations: FirebaseDatabaseAdapter, PostgresDatabaseAdapter, etc.
 */
export interface IDatabaseAdapter {
  /**
   * Initialize the database connection
   */
  initialize(): Promise<void>

  /**
   * Save game state to database
   *
   * @param roomId - Room identifier
   * @param state - Game state to save
   */
  saveGameState(roomId: RoomId, state: GameState): Promise<void>

  /**
   * Load game state from database
   *
   * @param roomId - Room identifier
   * @returns Game state or null if not found
   */
  loadGameState(roomId: RoomId): Promise<GameState | null>

  /**
   * Delete room data from database
   *
   * @param roomId - Room identifier
   */
  deleteRoom(roomId: RoomId): Promise<void>

  /**
   * Update room metadata
   *
   * @param roomId - Room identifier
   * @param metadata - Metadata to save
   */
  updateRoomMetadata(roomId: RoomId, metadata: RoomMetadata): Promise<void>

  /**
   * Get room metadata
   *
   * @param roomId - Room identifier
   * @returns Room metadata or null if not found
   */
  getRoomMetadata(roomId: RoomId): Promise<RoomMetadata | null>

  /**
   * Get all room metadata
   *
   * @returns Array of all room metadata
   */
  getAllRoomMetadata(): Promise<RoomMetadata[]>

  /**
   * Get inactive rooms (for cleanup)
   *
   * @param olderThan - Timestamp threshold (rooms inactive before this)
   * @returns Array of room IDs
   */
  getInactiveRooms(olderThan: number): Promise<RoomId[]>

  /**
   * Check if room exists in database
   *
   * @param roomId - Room identifier
   * @returns True if room exists
   */
  roomExists(roomId: RoomId): Promise<boolean>

  /**
   * Close database connection
   */
  close(): Promise<void>
}

/**
 * Database adapter factory options
 */
export interface DatabaseAdapterOptions {
  /** Adapter type */
  type: 'firebase' | 'postgres' | 'redis' | 'memory'

  /** Connection configuration */
  config: Record<string, unknown>
}
