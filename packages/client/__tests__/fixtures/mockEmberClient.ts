/**
 * MockEmberClient - A test double that mirrors EmberClient's public API
 * without creating real sockets.
 *
 * Tests call `simulate*` methods to trigger listener callbacks.
 */

import type { GameState, PlayerId, RoomId } from '@bonfire/core';
import type {
  ConnectionStatus,
  ErrorResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  BaseResponse,
  ActionResponse,
  StateResponse,
  EmberGameEvent,
} from '../../src/types';

type Listener<T> = (data: T) => void;

export class MockEmberClient {
  private _status: ConnectionStatus = 'disconnected';
  private _gameState: GameState | null = null;
  private _playerId: PlayerId | null = null;
  private _roomId: RoomId | null = null;

  private stateListeners = new Set<Listener<GameState>>();
  private statusListeners = new Set<Listener<ConnectionStatus>>();
  private errorListeners = new Set<Listener<ErrorResponse>>();
  private eventListeners = new Map<string, Set<Listener<unknown>>>();
  private roomClosedListeners = new Set<Listener<string>>();

  // Getters (same as EmberClient)
  get status(): ConnectionStatus {
    return this._status;
  }
  get gameState(): GameState | null {
    return this._gameState;
  }
  get playerId(): PlayerId | null {
    return this._playerId;
  }
  get roomId(): RoomId | null {
    return this._roomId;
  }
  get isConnected(): boolean {
    return this._status === 'connected';
  }

  // Connection
  connect = vi.fn(() => {
    this._status = 'connected';
    this.statusListeners.forEach((l) => l('connected'));
  });

  disconnect = vi.fn(() => {
    this._status = 'disconnected';
    this._gameState = null;
    this._playerId = null;
    this._roomId = null;
    this.statusListeners.forEach((l) => l('disconnected'));
  });

  // Room operations
  createRoom = vi.fn(async (gameType: string, hostName: string): Promise<RoomCreateResponse> => {
    const state: GameState = {
      roomId: 'ABCDEF',
      phase: 'lobby',
      players: [
        { id: 'host-1', name: hostName, isHost: true, isConnected: true, joinedAt: Date.now() },
      ],
    };
    this._roomId = 'ABCDEF';
    this._playerId = 'host-1';
    this._gameState = state;
    this.stateListeners.forEach((l) => l(state));
    return { success: true, roomId: 'ABCDEF', state };
  });

  joinRoom = vi.fn(async (roomId: RoomId, playerName: string): Promise<RoomJoinResponse> => {
    const state: GameState = {
      roomId,
      phase: 'lobby',
      players: [
        { id: 'host-1', name: 'Host', isHost: true, isConnected: true, joinedAt: Date.now() },
        {
          id: 'player-2',
          name: playerName,
          isHost: false,
          isConnected: true,
          joinedAt: Date.now(),
        },
      ],
    };
    this._roomId = roomId;
    this._playerId = 'player-2';
    this._gameState = state;
    this.stateListeners.forEach((l) => l(state));
    return { success: true, state, playerId: 'player-2' };
  });

  leaveRoom = vi.fn(async (): Promise<BaseResponse> => {
    this._roomId = null;
    this._playerId = null;
    this._gameState = null;
    return { success: true };
  });

  startGame = vi.fn(async (): Promise<BaseResponse> => {
    return { success: true };
  });

  sendAction = vi.fn(async (_actionType: string, _payload: unknown): Promise<ActionResponse> => {
    return { success: true };
  });

  requestState = vi.fn(async (): Promise<StateResponse> => {
    return { success: true, state: this._gameState ?? undefined };
  });

  // Subscription API
  onStateChange(listener: Listener<GameState>): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onStatusChange(listener: Listener<ConnectionStatus>): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onError(listener: Listener<ErrorResponse>): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  onGameEvent(eventType: string, listener: Listener<unknown>): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }

  onRoomClosed(listener: Listener<string>): () => void {
    this.roomClosedListeners.add(listener);
    return () => {
      this.roomClosedListeners.delete(listener);
    };
  }

  getSocket(): unknown {
    return null;
  }

  // ---- Simulation helpers (for tests) ----

  simulateStateUpdate(state: GameState): void {
    this._gameState = state;
    this.stateListeners.forEach((l) => l(state));
  }

  simulateStatusChange(status: ConnectionStatus): void {
    this._status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  simulateError(error: ErrorResponse): void {
    this.errorListeners.forEach((l) => l(error));
  }

  simulateGameEvent(event: EmberGameEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((l) => l(event.payload));
    }
    const wildcardListeners = this.eventListeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((l) => l(event));
    }
  }

  simulateRoomClosed(reason: string): void {
    this._roomId = null;
    this._playerId = null;
    this._gameState = null;
    this.roomClosedListeners.forEach((l) => l(reason));
  }

  setPlayerId(playerId: PlayerId | null): void {
    this._playerId = playerId;
  }

  setRoomId(roomId: RoomId | null): void {
    this._roomId = roomId;
  }
}
