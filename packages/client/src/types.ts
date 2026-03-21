/**
 * Client-specific type definitions for Bonfire
 *
 * Response types are imported from @bonfire-ember/core to maintain
 * type safety between client and server without duplication.
 */

import type {
  GameState,
  RoomId,
  PlayerId,
  BaseResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomReconnectResponse,
  StateResponse,
  ActionResponse,
  ErrorResponse,
} from '@bonfire-ember/core';

// ---- Connection ----

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ---- Client Configuration ----

export interface EmberClientConfig {
  /** Server URL (e.g., "http://localhost:3000") */
  url: string;
  /** Socket.io connection options */
  socketOptions?: Record<string, unknown>;
  /** Auto-connect on instantiation (default: false) */
  autoConnect?: boolean;
  /** Enable reconnection (default: true) */
  reconnection?: boolean;
  /** Max reconnection attempts (default: 5) */
  reconnectionAttempts?: number;
}

// ---- Server Response Types (imported from @bonfire-ember/core) ----
// Re-export for convenience
export type {
  BaseResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomReconnectResponse,
  StateResponse,
  ActionResponse,
  ErrorResponse,
}

// ---- Socket.io Event Contracts (mirrored from @bonfire-ember/server) ----

export interface ClientToServerEvents {
  'room:create': (gameType: string, hostName: string, callback: (response: RoomCreateResponse) => void) => void;
  'room:join': (roomId: RoomId, playerName: string, callback: (response: RoomJoinResponse) => void) => void;
  'room:leave': (callback?: (response: BaseResponse) => void) => void;
  'game:start': (callback?: (response: BaseResponse) => void) => void;
  'game:action': (actionType: string, payload: unknown, callback?: (response: ActionResponse) => void) => void;
  'state:request': (callback: (response: StateResponse) => void) => void;
  'room:reconnect': (roomId: RoomId, playerId: PlayerId, callback: (response: RoomReconnectResponse) => void) => void;
}

export interface ServerToClientEvents {
  'state:update': (state: GameState) => void;
  'state:sync': (state: GameState) => void;
  'event:emit': (event: { type: string; payload: unknown }) => void;
  error: (error: ErrorResponse) => void;
  'room:closed': (reason: string) => void;
}

// ---- Game Events ----

export interface EmberGameEvent {
  type: string;
  payload: unknown;
}
