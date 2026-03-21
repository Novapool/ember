/**
 * Server-specific type definitions for Bonfire
 */

import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import type {
  SocialGame,
  GameState,
  RoomId,
  PlayerId,
  RoomStatus,
  BaseResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomReconnectResponse,
  StateResponse,
  ActionResponse,
  ErrorResponse,
} from '@bonfire-ember/core'
import type { SocketStateSynchronizer } from './core/SocketStateSynchronizer'

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Port to listen on */
  port: number

  /** Node environment (development, production, test) */
  nodeEnv?: 'development' | 'production' | 'test'

  /** Firebase configuration */
  firebase?: {
    projectId: string
    databaseURL: string
    credentialsPath?: string
  }

  /** Room settings */
  room?: {
    /** Default TTL for inactive rooms in milliseconds (default: 24 hours) */
    defaultTTL?: number
    /** Maximum number of rooms per server */
    maxRooms?: number
    /** Cleanup scan interval in milliseconds */
    cleanupInterval?: number
  }

  /** Rate limiting */
  rateLimit?: {
    /** Time window in milliseconds */
    windowMs?: number
    /** Maximum requests per window */
    maxRequests?: number
  }

  /** Admin settings */
  admin?: {
    /** Enable admin endpoints */
    enabled?: boolean
    /** API key for admin operations */
    apiKey?: string
  }

  /** CORS settings */
  cors?: {
    origin: string | string[]
    credentials?: boolean
  }
}

/**
 * Room metadata for tracking and cleanup
 */
export interface RoomMetadata {
  /** Room ID */
  roomId: RoomId

  /** Room creation timestamp */
  createdAt: number

  /** Last activity timestamp */
  lastActivity: number

  /** Host player ID */
  hostId: PlayerId

  /** Current number of players */
  playerCount: number

  /** Room status */
  status: RoomStatus

  /** Game type/name */
  gameType: string

  /** Custom metadata */
  custom?: Record<string, unknown>
}

/**
 * Room instance containing game and synchronizer
 */
export interface RoomInstance<T extends SocialGame<any> = SocialGame<any>> {
  /** Room ID */
  roomId: RoomId

  /** Game instance */
  game: T

  /** State synchronizer */
  synchronizer: SocketStateSynchronizer<any>

  /** Room metadata */
  metadata: RoomMetadata

  /** Cleanup timeout timer */
  cleanupTimer?: NodeJS.Timeout
}

/**
 * Room information for listing/display
 */
export interface RoomInfo {
  /** Room ID / code */
  roomId: RoomId

  /** Room status */
  status: RoomStatus

  /** Number of players */
  playerCount: number

  /** Maximum players */
  maxPlayers: number

  /** Host player name */
  hostName: string

  /** Game type */
  gameType: string

  /** Created at timestamp */
  createdAt: number

  /** Is password protected */
  isPrivate?: boolean
}

/**
 * Socket.io client-to-server events
 */
export interface ClientToServerEvents {
  /** Create a new room */
  'room:create': (gameType: string, hostName: string, callback: (response: RoomCreateResponse) => void) => void

  /** Join an existing room */
  'room:join': (roomId: RoomId, playerName: string, callback: (response: RoomJoinResponse) => void) => void

  /** Leave current room */
  'room:leave': (callback?: (response: BaseResponse) => void) => void

  /** Start the game (host only) */
  'game:start': (callback?: (response: BaseResponse) => void) => void

  /** Submit a game action */
  'game:action': (actionType: string, payload: unknown, callback?: (response: ActionResponse) => void) => void

  /** Request current state (reconnection) */
  'state:request': (callback: (response: StateResponse) => void) => void

  /** Reconnect to a room after page refresh using saved session */
  'room:reconnect': (roomId: RoomId, playerId: PlayerId, callback: (response: RoomReconnectResponse) => void) => void
}

/**
 * Socket.io server-to-client events
 */
export interface ServerToClientEvents {
  /** Full state update to all players in room */
  'state:update': (state: GameState) => void

  /** State sync to specific player (reconnection) */
  'state:sync': (state: GameState) => void

  /** Game event broadcast */
  'event:emit': (event: { type: string; payload: unknown }) => void

  /** Error notification */
  error: (error: ErrorResponse) => void

  /** Room closed notification */
  'room:closed': (reason: string) => void
}

// Response types are now imported from @bonfire-ember/core (see contracts.ts)
// Re-export for backwards compatibility
export type {
  BaseResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomReconnectResponse,
  StateResponse,
  ActionResponse,
  ErrorResponse,
}

/**
 * Socket context data
 */
export interface SocketContext {
  socket: Socket
  playerId?: PlayerId
  roomId?: RoomId
}

/**
 * Server statistics
 */
export interface ServerStats {
  /** Total active rooms */
  totalRooms: number

  /** Total connected players */
  totalPlayers: number

  /** Rooms by status */
  roomsByStatus: Record<RoomStatus, number>

  /** Server uptime in milliseconds */
  uptime: number

  /** Memory usage */
  memoryUsage: NodeJS.MemoryUsage
}

/**
 * Socket.io server type with typed events
 */
export type TypedSocketServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>

/**
 * Socket.io client socket type with typed events
 */
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>
