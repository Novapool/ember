import { useMemo } from 'react';
import { useGameState } from './useGameState';
import { usePlayer } from './usePlayer';
import type { Player, PlayerId } from '@bonfire-ember/core';

/**
 * Convenience hook for turn-based games.
 *
 * Reads `currentTurnIndex` from game state and derives who the current
 * turn player is, eliminating manual playerOrder indexing in game UIs.
 *
 * Requires `currentTurnIndex` to be set in game state (set by server game logic).
 *
 * @example
 * const { isMyTurn, currentPlayer, turnIndex } = useTurn();
 * if (isMyTurn) return <YourTurnBanner />;
 */
export function useTurn(): {
  isMyTurn: boolean;
  currentPlayerId: PlayerId | null;
  currentPlayer: Player | null;
  turnIndex: number | null;
} {
  const { state } = useGameState();
  const { playerId, players } = usePlayer();

  const turnIndex = state?.currentTurnIndex ?? null;

  const currentPlayerId = useMemo(() => {
    if (turnIndex == null || !state?.playerOrder) return null;
    return state.playerOrder[turnIndex] ?? null;
  }, [state, turnIndex]);

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === currentPlayerId) ?? null,
    [players, currentPlayerId]
  );

  const isMyTurn = playerId !== null && playerId === currentPlayerId;

  return { isMyTurn, currentPlayerId, currentPlayer, turnIndex };
}
