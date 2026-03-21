import { useMemo } from 'react';
import { useEmberContext } from '../context/EmberProvider';
import { useGameState } from './useGameState';
import type { Player, PlayerId } from '@bonfire-ember/core';

/**
 * Access current player info and the full player list.
 *
 * @example
 * const { player, isHost, players } = usePlayer();
 * if (isHost) showStartButton();
 */
export function usePlayer(): {
  player: Player | null;
  playerId: PlayerId | null;
  isHost: boolean;
  players: Player[];
} {
  const { client } = useEmberContext();
  const { state } = useGameState();

  const playerId = client.playerId;

  const player = useMemo(
    () => state?.players.find((p) => p.id === playerId) ?? null,
    [state, playerId]
  );

  const isHost = player?.isHost ?? false;

  const players = useMemo(() => state?.players ?? [], [state]);

  return { player, playerId, isHost, players };
}
