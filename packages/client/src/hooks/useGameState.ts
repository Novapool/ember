import { useSyncExternalStore, useCallback } from 'react';
import { useEmberContext } from '../context/EmberProvider';
import type { GameState } from '@bonfire-ember/core';

/**
 * Subscribe to game state updates from the server.
 *
 * Uses `useSyncExternalStore` for tear-free reads in concurrent mode.
 *
 * Accepts an optional `TState` generic to avoid casting at every call site:
 *
 * @example
 * const { state } = useGameState();
 * if (state) console.log(state.phase);
 *
 * // With typed game state — no cast needed:
 * interface MyGameState extends GameState {
 *   score: Record<string, number>;
 * }
 * const { state } = useGameState<MyGameState>();
 * if (state) console.log(state.score);
 */
export function useGameState<TState extends GameState = GameState>(): {
  state: TState | null;
  requestState: () => Promise<void>;
} {
  const { client } = useEmberContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => client.onStateChange(onStoreChange),
    [client]
  );

  const getSnapshot = useCallback(() => client.gameState as TState | null, [client]);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  const requestState = useCallback(async () => {
    await client.requestState();
  }, [client]);

  return { state, requestState };
}
