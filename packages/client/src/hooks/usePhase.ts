import { useGameState } from './useGameState';
import type { Phase } from '@bonfire-ember/core';

/**
 * Access the current game phase.
 *
 * @example
 * const phase = usePhase();
 * if (phase === 'voting') return <VotingUI />;
 */
export function usePhase(): Phase | null {
  const { state } = useGameState();
  return state?.phase ?? null;
}
