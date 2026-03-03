import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  io: { on: vi.fn() },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { BonfireClient } from '../../src/client/BonfireClient';
import type { GameState } from '@bonfire/core';

describe('BonfireClient', () => {
  let client: BonfireClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock socket handlers
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.connect.mockReset();
    mockSocket.disconnect.mockReset();
    mockSocket.io.on.mockReset();

    client = new BonfireClient({ url: 'http://localhost:3000' });
  });

  describe('constructor', () => {
    it('should initialize with disconnected status', () => {
      expect(client.status).toBe('disconnected');
      expect(client.gameState).toBeNull();
      expect(client.playerId).toBeNull();
      expect(client.roomId).toBeNull();
      expect(client.isConnected).toBe(false);
    });

    it('should set up socket event listeners', () => {
      const eventNames = mockSocket.on.mock.calls.map((call: unknown[]) => call[0]);
      expect(eventNames).toContain('connect');
      expect(eventNames).toContain('disconnect');
      expect(eventNames).toContain('state:update');
      expect(eventNames).toContain('state:sync');
      expect(eventNames).toContain('event:emit');
      expect(eventNames).toContain('error');
      expect(eventNames).toContain('room:closed');
    });

    it('should listen for reconnect_attempt on the manager', () => {
      expect(mockSocket.io.on).toHaveBeenCalledWith('reconnect_attempt', expect.any(Function));
    });
  });

  describe('connect/disconnect', () => {
    it('should call socket.connect and set status to connecting', () => {
      const statusSpy = vi.fn();
      client.onStatusChange(statusSpy);

      client.connect();

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith('connecting');
    });

    it('should call socket.disconnect and clear state', () => {
      client.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(client.status).toBe('disconnected');
      expect(client.gameState).toBeNull();
      expect(client.playerId).toBeNull();
      expect(client.roomId).toBeNull();
    });
  });

  describe('socket event handlers', () => {
    function getHandler(eventName: string): (...args: unknown[]) => void {
      const call = mockSocket.on.mock.calls.find((c: unknown[]) => c[0] === eventName);
      return call![1] as (...args: unknown[]) => void;
    }

    it('should set status to connected on connect event', () => {
      const statusSpy = vi.fn();
      client.onStatusChange(statusSpy);

      const handler = getHandler('connect');
      handler();

      expect(client.status).toBe('connected');
      expect(statusSpy).toHaveBeenCalledWith('connected');
    });

    it('should set status to disconnected on disconnect event', () => {
      const handler = getHandler('disconnect');
      handler();

      expect(client.status).toBe('disconnected');
    });

    it('should update gameState on state:update', () => {
      const stateSpy = vi.fn();
      client.onStateChange(stateSpy);

      const state: GameState = {
        roomId: 'ABC123',
        phase: 'lobby',
        players: [],
      };

      const handler = getHandler('state:update');
      handler(state);

      expect(client.gameState).toEqual(state);
      expect(stateSpy).toHaveBeenCalledWith(state);
    });

    it('should update gameState on state:sync', () => {
      const stateSpy = vi.fn();
      client.onStateChange(stateSpy);

      const state: GameState = {
        roomId: 'ABC123',
        phase: 'playing',
        players: [],
      };

      const handler = getHandler('state:sync');
      handler(state);

      expect(client.gameState).toEqual(state);
      expect(stateSpy).toHaveBeenCalledWith(state);
    });

    it('should dispatch game events to typed listeners', () => {
      const playerJoinedSpy = vi.fn();
      client.onGameEvent('player:joined', playerJoinedSpy);

      const handler = getHandler('event:emit');
      handler({ type: 'player:joined', payload: { name: 'Alice' } });

      expect(playerJoinedSpy).toHaveBeenCalledWith({ name: 'Alice' });
    });

    it('should forward error events to listeners', () => {
      const errorSpy = vi.fn();
      client.onError(errorSpy);

      const handler = getHandler('error');
      handler({ message: 'Room full', code: 'ROOM_FULL' });

      expect(errorSpy).toHaveBeenCalledWith({ message: 'Room full', code: 'ROOM_FULL' });
    });

    it('should clear state and notify on room:closed', () => {
      // First set some state
      const stateHandler = getHandler('state:update');
      stateHandler({
        roomId: 'ABC123',
        phase: 'lobby',
        players: [],
      });

      const roomClosedSpy = vi.fn();
      client.onRoomClosed(roomClosedSpy);

      const handler = getHandler('room:closed');
      handler('Host left');

      expect(client.roomId).toBeNull();
      expect(client.playerId).toBeNull();
      expect(client.gameState).toBeNull();
      expect(roomClosedSpy).toHaveBeenCalledWith('Host left');
    });
  });

  describe('createRoom', () => {
    it('should emit room:create and resolve with response', async () => {
      const state: GameState = {
        roomId: 'XYZ789',
        phase: 'lobby',
        players: [
          { id: 'host-1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
        ],
      };

      mockSocket.emit.mockImplementation(
        (_event: string, _gameType: string, _hostName: string, callback: Function) => {
          callback({ success: true, roomId: 'XYZ789', state });
        }
      );

      const result = await client.createRoom('trivia', 'Alice');

      expect(result.success).toBe(true);
      expect(result.roomId).toBe('XYZ789');
      expect(client.roomId).toBe('XYZ789');
      expect(client.playerId).toBe('host-1');
      expect(client.gameState).toEqual(state);
    });

    it('should not set state on failure', async () => {
      mockSocket.emit.mockImplementation(
        (_event: string, _gameType: string, _hostName: string, callback: Function) => {
          callback({ success: false, error: 'Server full', code: 'SERVER_FULL' });
        }
      );

      const result = await client.createRoom('trivia', 'Alice');

      expect(result.success).toBe(false);
      expect(client.roomId).toBeNull();
      expect(client.playerId).toBeNull();
    });
  });

  describe('joinRoom', () => {
    it('should emit room:join and resolve with response', async () => {
      const state: GameState = {
        roomId: 'ABC123',
        phase: 'lobby',
        players: [
          { id: 'host-1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
          { id: 'player-2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2000 },
        ],
      };

      mockSocket.emit.mockImplementation(
        (_event: string, _roomId: string, _name: string, callback: Function) => {
          callback({ success: true, state, playerId: 'player-2' });
        }
      );

      const result = await client.joinRoom('ABC123', 'Bob');

      expect(result.success).toBe(true);
      expect(client.roomId).toBe('ABC123');
      expect(client.playerId).toBe('player-2');
      expect(client.gameState).toEqual(state);
    });
  });

  describe('leaveRoom', () => {
    it('should emit room:leave and clear state on success', async () => {
      mockSocket.emit.mockImplementation((_event: string, callback: Function) => {
        callback({ success: true });
      });

      const result = await client.leaveRoom();

      expect(result.success).toBe(true);
      expect(client.roomId).toBeNull();
      expect(client.playerId).toBeNull();
      expect(client.gameState).toBeNull();
    });
  });

  describe('startGame', () => {
    it('should emit game:start and resolve', async () => {
      mockSocket.emit.mockImplementation((_event: string, callback: Function) => {
        callback({ success: true });
      });

      const result = await client.startGame();
      expect(result.success).toBe(true);
    });
  });

  describe('sendAction', () => {
    it('should emit game:action with type and payload', async () => {
      mockSocket.emit.mockImplementation(
        (_event: string, _type: string, _payload: unknown, callback: Function) => {
          callback({ success: true, data: { score: 10 } });
        }
      );

      const result = await client.sendAction('answer', { text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ score: 10 });
    });
  });

  describe('requestState', () => {
    it('should emit state:request and update gameState', async () => {
      const state: GameState = {
        roomId: 'ABC123',
        phase: 'playing',
        players: [],
      };

      mockSocket.emit.mockImplementation((_event: string, callback: Function) => {
        callback({ success: true, state });
      });

      const stateSpy = vi.fn();
      client.onStateChange(stateSpy);

      const result = await client.requestState();
      expect(result.success).toBe(true);
      expect(client.gameState).toEqual(state);
      expect(stateSpy).toHaveBeenCalledWith(state);
    });
  });

  describe('subscription cleanup', () => {
    it('should unsubscribe state listeners', () => {
      const listener = vi.fn();
      const unsubscribe = client.onStateChange(listener);

      // Trigger a state update
      const handler = mockSocket.on.mock.calls.find(
        (c: unknown[]) => c[0] === 'state:update'
      )![1] as Function;
      handler({ roomId: 'A', phase: 'lobby', players: [] });
      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      handler({ roomId: 'B', phase: 'lobby', players: [] });
      expect(listener).toHaveBeenCalledTimes(1); // not called again
    });

    it('should unsubscribe status listeners', () => {
      const listener = vi.fn();
      const unsubscribe = client.onStatusChange(listener);

      client.connect();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      client.connect();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe event listeners', () => {
      const listener = vi.fn();
      const unsubscribe = client.onGameEvent('test', listener);

      const handler = mockSocket.on.mock.calls.find(
        (c: unknown[]) => c[0] === 'event:emit'
      )![1] as Function;

      handler({ type: 'test', payload: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      handler({ type: 'test', payload: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSocket', () => {
    it('should expose the raw socket', () => {
      expect(client.getSocket()).toBe(mockSocket);
    });
  });
});
