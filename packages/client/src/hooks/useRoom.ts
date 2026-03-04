import { useCallback } from 'react';
import { useEmberContext } from '../context/EmberProvider';
import { useGameState } from './useGameState';
import type { RoomId, PlayerId } from '@bonfire/core';
import type { RoomCreateResponse, RoomJoinResponse, RoomReconnectResponse, BaseResponse, ActionResponse } from '../types';

/**
 * Room and game operations: create, join, leave, start, send actions, and reconnect.
 *
 * @example
 * const { roomId, isInRoom, createRoom, joinRoom, startGame, sendAction, reconnectToRoom } = useRoom();
 * await createRoom('my-game', 'Alice');
 *
 * // Reconnect after page refresh:
 * const session = client.loadSession();
 * if (session) await reconnectToRoom(session.roomId, session.playerId);
 */
export function useRoom(): {
  roomId: RoomId | null;
  isInRoom: boolean;
  createRoom: (gameType: string, hostName: string) => Promise<RoomCreateResponse>;
  joinRoom: (roomId: RoomId, playerName: string) => Promise<RoomJoinResponse>;
  leaveRoom: () => Promise<BaseResponse>;
  startGame: () => Promise<BaseResponse>;
  sendAction: (actionType: string, payload: unknown) => Promise<ActionResponse>;
  reconnectToRoom: (roomId: RoomId, playerId: PlayerId) => Promise<RoomReconnectResponse>;
} {
  const { client } = useEmberContext();
  // Subscribe to state so roomId re-renders when it changes
  useGameState();

  const roomId = client.roomId;
  const isInRoom = roomId !== null;

  const createRoom = useCallback(
    (gameType: string, hostName: string) => client.createRoom(gameType, hostName),
    [client]
  );

  const joinRoom = useCallback(
    (roomId: RoomId, playerName: string) => client.joinRoom(roomId, playerName),
    [client]
  );

  const leaveRoom = useCallback(() => client.leaveRoom(), [client]);

  const startGame = useCallback(() => client.startGame(), [client]);

  const sendAction = useCallback(
    (actionType: string, payload: unknown) => client.sendAction(actionType, payload),
    [client]
  );

  const reconnectToRoom = useCallback(
    (roomId: RoomId, playerId: PlayerId) => client.reconnectToRoom(roomId, playerId),
    [client]
  );

  return { roomId, isInRoom, createRoom, joinRoom, leaveRoom, startGame, sendAction, reconnectToRoom };
}
