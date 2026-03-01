import { useState, useCallback } from 'react';
import { useGameState } from './useGameState';
import { usePlayer } from './usePlayer';
import { useRoom } from './useRoom';
import type { Player } from '@bonfire/core';

export interface UseLobbyOptions {
  /** Override automatic room code detection */
  roomCode?: string;
  /** Custom start button handler — if omitted, calls startGame() */
  onStart?: () => void | Promise<void>;
}

export interface UseLobbyReturn {
  roomCode: string;
  players: Player[];
  isHost: boolean;
  playerId: string | null;
  minPlayers: number;
  maxPlayers: number;
  canStart: boolean;
  isStarting: boolean;
  copied: boolean;
  handleCopyCode: () => Promise<void>;
  handleStart: () => Promise<void>;
}

/**
 * Headless hook containing all Lobby business logic.
 * Use this when you want the lobby state and handlers but supply your own markup.
 *
 * @example
 * const { roomCode, players, canStart, handleCopyCode, handleStart } = useLobby();
 * // render your own UI using this data
 */
export function useLobby(options: UseLobbyOptions = {}): UseLobbyReturn {
  const { roomCode: overrideRoomCode, onStart } = options;
  const { state } = useGameState();
  const { isHost, playerId } = usePlayer();
  const { startGame } = useRoom();
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const roomCode = overrideRoomCode || (state?.metadata?.roomCode as string) || state?.roomId || '';
  const players = state?.players || [];

  const config = (state?.metadata?.config as any) || {};
  const minPlayers = config.minPlayers || 2;
  const maxPlayers = config.maxPlayers || 8;

  const canStart = isHost && players.length >= minPlayers;

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  }, [roomCode]);

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setIsStarting(true);
    try {
      if (onStart) {
        await onStart();
      } else {
        const result = await startGame();
        if (!result.success) console.error('Failed to start game:', result.error);
      }
    } catch (error) {
      console.error('Error starting game:', error);
    } finally {
      setIsStarting(false);
    }
  }, [canStart, onStart, startGame]);

  return {
    roomCode,
    players,
    isHost,
    playerId,
    minPlayers,
    maxPlayers,
    canStart,
    isStarting,
    copied,
    handleCopyCode,
    handleStart,
  };
}
