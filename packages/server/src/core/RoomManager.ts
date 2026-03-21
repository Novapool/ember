/**
 * Room manager for orchestrating multiple game rooms
 *
 * Responsibilities:
 * - Create and delete rooms
 * - Track player-to-room mapping
 * - Manage room cleanup (TTL)
 * - List and filter rooms
 */

import type { SocialGame, RoomId, PlayerId } from '@bonfire-ember/core'
import type { RoomInstance, RoomInfo, TypedSocketServer, RoomMetadata } from '../types'
import type { IDatabaseAdapter } from '../database/IDatabaseAdapter'
import { SocketStateSynchronizer } from './SocketStateSynchronizer'
import { generateRoomCode } from '../utils/roomCodeGenerator'
import { RoomNotFoundError, RoomFullError } from '../utils/errors'

/**
 * Room manager configuration
 */
export interface RoomManagerConfig {
  /** Default TTL for inactive rooms (milliseconds) */
  defaultTTL?: number

  /** Maximum number of rooms */
  maxRooms?: number

  /** Cleanup scan interval (milliseconds) */
  cleanupInterval?: number
}

/**
 * Game factory function
 */
export type GameFactory<T extends SocialGame<any>> = (
  roomId: RoomId,
  synchronizer: SocketStateSynchronizer<any>
) => T

/**
 * Room manager for multi-room orchestration
 */
export class RoomManager<T extends SocialGame<any> = SocialGame<any>> {
  private rooms: Map<RoomId, RoomInstance<T>> = new Map()
  private playerToRoom: Map<PlayerId, RoomId> = new Map()
  private cleanupIntervalTimer?: NodeJS.Timeout

  private readonly defaultTTL: number
  private readonly maxRooms: number
  private readonly cleanupInterval: number

  constructor(
    private readonly io: TypedSocketServer,
    private readonly databaseAdapter: IDatabaseAdapter,
    private readonly gameFactory: GameFactory<T>,
    private readonly gameType: string,
    config: RoomManagerConfig = {}
  ) {
    this.defaultTTL = config.defaultTTL ?? 24 * 60 * 60 * 1000 // 24 hours
    this.maxRooms = config.maxRooms ?? 1000
    this.cleanupInterval = config.cleanupInterval ?? 60 * 60 * 1000 // 1 hour
  }

  /**
   * Create a new room
   *
   * @param hostPlayerId - Host player ID
   * @returns Created room instance
   */
  async createRoom(hostPlayerId: PlayerId): Promise<RoomInstance<T>> {
    // Check room limit
    if (this.rooms.size >= this.maxRooms) {
      throw new Error(`Maximum room limit reached (${this.maxRooms})`)
    }

    // Generate unique room code
    let roomId: RoomId
    let attempts = 0
    const maxAttempts = 10

    do {
      roomId = generateRoomCode()
      attempts++
      if (attempts > maxAttempts) {
        throw new Error('Failed to generate unique room code')
      }
    } while (this.rooms.has(roomId))

    // Create synchronizer
    const synchronizer = new SocketStateSynchronizer(
      roomId,
      this.io,
      this.databaseAdapter
    )

    // Create game instance
    const game = this.gameFactory(roomId, synchronizer)

    // Create room metadata
    const now = Date.now()
    const metadata: RoomMetadata = {
      roomId,
      createdAt: now,
      lastActivity: now,
      hostId: hostPlayerId,
      playerCount: 0,
      status: 'waiting',
      gameType: this.gameType,
    }

    // Create room instance
    const roomInstance: RoomInstance<T> = {
      roomId,
      game,
      synchronizer,
      metadata,
    }

    // Store room
    this.rooms.set(roomId, roomInstance)

    // Persist metadata
    await this.databaseAdapter.updateRoomMetadata(roomId, metadata)

    return roomInstance
  }

  /**
   * Get a room by ID
   *
   * @param roomId - Room identifier
   * @returns Room instance
   * @throws RoomNotFoundError if room doesn't exist
   */
  getRoom(roomId: RoomId): RoomInstance<T> {
    const room = this.rooms.get(roomId)
    if (!room) {
      throw new RoomNotFoundError(roomId)
    }
    return room
  }

  /**
   * Check if room exists
   */
  hasRoom(roomId: RoomId): boolean {
    return this.rooms.has(roomId)
  }

  /**
   * Delete a room
   *
   * @param roomId - Room identifier
   */
  async deleteRoom(roomId: RoomId): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      return // Already deleted
    }

    // Clear cleanup timer
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer)
    }

    // Remove all player mappings for this room
    for (const [playerId, mappedRoomId] of this.playerToRoom.entries()) {
      if (mappedRoomId === roomId) {
        this.playerToRoom.delete(playerId)
      }
    }

    // Clear synchronizer mappings
    room.synchronizer.clearPlayerMappings()

    // Delete from database
    await this.databaseAdapter.deleteRoom(roomId)

    // Remove from memory
    this.rooms.delete(roomId)
  }

  /**
   * List all rooms (optionally filtered)
   *
   * @param filter - Optional filter function
   * @returns Array of room info
   */
  listRooms(filter?: (room: RoomInstance<T>) => boolean): RoomInfo[] {
    const rooms = Array.from(this.rooms.values())
    const filtered = filter ? rooms.filter(filter) : rooms

    return filtered.map((room) => ({
      roomId: room.roomId,
      status: room.metadata.status,
      playerCount: room.metadata.playerCount,
      maxPlayers: room.game.config.maxPlayers,
      hostName: room.game.getPlayers().find((p) => p.isHost)?.name ?? 'Unknown',
      gameType: room.metadata.gameType,
      createdAt: room.metadata.createdAt,
    }))
  }

  /**
   * Get room ID for a player
   */
  getRoomIdForPlayer(playerId: PlayerId): RoomId | undefined {
    return this.playerToRoom.get(playerId)
  }

  /**
   * Track player in room
   */
  trackPlayer(playerId: PlayerId, roomId: RoomId): void {
    this.playerToRoom.set(playerId, roomId)
  }

  /**
   * Untrack player from room
   */
  untrackPlayer(playerId: PlayerId): void {
    this.playerToRoom.delete(playerId)
  }

  /**
   * Update room activity timestamp
   */
  async updateActivity(roomId: RoomId): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      return
    }

    room.metadata.lastActivity = Date.now()
    await this.databaseAdapter.updateRoomMetadata(roomId, room.metadata)

    // Cancel existing cleanup timer
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer)
    }

    // Set new cleanup timer
    room.cleanupTimer = setTimeout(() => {
      this.deleteRoom(roomId).catch((error) => {
        console.error(`Failed to cleanup room ${roomId}:`, error)
      })
    }, this.defaultTTL)
  }

  /**
   * Update room metadata
   */
  async updateRoomMetadata(roomId: RoomId, updates: Partial<RoomMetadata>): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) {
      throw new RoomNotFoundError(roomId)
    }

    Object.assign(room.metadata, updates)
    await this.databaseAdapter.updateRoomMetadata(roomId, room.metadata)
  }

  /**
   * Start periodic cleanup of inactive rooms
   */
  startCleanup(): void {
    if (this.cleanupIntervalTimer) {
      return // Already running
    }

    this.cleanupIntervalTimer = setInterval(() => {
      this.performCleanup().catch((error) => {
        console.error('Failed to perform cleanup:', error)
      })
    }, this.cleanupInterval)
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupIntervalTimer) {
      clearInterval(this.cleanupIntervalTimer)
      this.cleanupIntervalTimer = undefined
    }
  }

  /**
   * Perform cleanup of inactive rooms
   */
  private async performCleanup(): Promise<void> {
    const threshold = Date.now() - this.defaultTTL
    const inactiveRoomIds = await this.databaseAdapter.getInactiveRooms(threshold)

    for (const roomId of inactiveRoomIds) {
      if (this.rooms.has(roomId)) {
        await this.deleteRoom(roomId)
      }
    }
  }

  /**
   * Get total number of rooms
   */
  getRoomCount(): number {
    return this.rooms.size
  }

  /**
   * Get total number of tracked players
   */
  getPlayerCount(): number {
    return this.playerToRoom.size
  }

  /**
   * Shutdown room manager
   */
  async shutdown(): Promise<void> {
    this.stopCleanup()

    // Clear all cleanup timers
    for (const room of this.rooms.values()) {
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer)
      }
    }

    // Clear all data
    this.rooms.clear()
    this.playerToRoom.clear()
  }
}
