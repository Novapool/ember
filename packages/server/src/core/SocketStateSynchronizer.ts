/**
 * Socket.io + Database state synchronizer
 *
 * Implements IStateSynchronizer by:
 * 1. Broadcasting state updates via Socket.io rooms
 * 2. Persisting state to database for recovery/debugging
 */

import type {
  IStateSynchronizer,
  GameState,
  PlayerId,
  GameEventType,
  GameEventPayloads,
  RoomId,
} from '@bonfire-ember/core'
import type { TypedSocketServer } from '../types'
import type { IDatabaseAdapter } from '../database/IDatabaseAdapter'

/**
 * Socket.io state synchronizer with database persistence
 */
export class SocketStateSynchronizer<TState extends GameState>
  implements IStateSynchronizer<TState>
{
  private playerSocketMap: Map<PlayerId, string> = new Map()

  constructor(
    private readonly roomId: RoomId,
    private readonly io: TypedSocketServer,
    private readonly databaseAdapter: IDatabaseAdapter
  ) {}

  /**
   * Register a player's socket ID for targeted messages
   */
  registerPlayer(playerId: PlayerId, socketId: string): void {
    this.playerSocketMap.set(playerId, socketId)
  }

  /**
   * Unregister a player's socket
   */
  unregisterPlayer(playerId: PlayerId): void {
    this.playerSocketMap.delete(playerId)
  }

  /**
   * Get socket ID for a player
   */
  getSocketId(playerId: PlayerId): string | undefined {
    return this.playerSocketMap.get(playerId)
  }

  /**
   * Broadcast full state to all players in the room
   */
  async broadcastState(state: TState): Promise<void> {
    // 1. Persist to database
    await this.databaseAdapter.saveGameState(this.roomId, state)

    // 2. Broadcast via Socket.io room
    this.io.to(this.roomId).emit('state:update', state)
  }

  /**
   * Send state to a specific player (for reconnection, etc.)
   */
  async sendToPlayer(playerId: PlayerId, state: TState): Promise<void> {
    const socketId = this.getSocketId(playerId)

    if (socketId) {
      this.io.to(socketId).emit('state:sync', state)
    }
  }

  /**
   * Broadcast a game event to all players in the room
   */
  async broadcastEvent<K extends GameEventType>(
    event: K,
    payload: GameEventPayloads[K]
  ): Promise<void> {
    this.io.to(this.roomId).emit('event:emit', {
      type: event,
      payload,
    })
  }

  /**
   * Broadcast a custom game-specific event to all players in the room
   */
  async broadcastCustomEvent(type: string, payload: unknown): Promise<void> {
    this.io.to(this.roomId).emit('event:emit', {
      type,
      payload,
    })
  }

  /**
   * Get all registered player IDs
   */
  getRegisteredPlayers(): PlayerId[] {
    return Array.from(this.playerSocketMap.keys())
  }

  /**
   * Clear all player socket mappings
   */
  clearPlayerMappings(): void {
    this.playerSocketMap.clear()
  }
}
