import { useEffect } from 'react';
import { useEmberContext } from '../context/EmberProvider';

/**
 * Subscribe to a specific game event type.
 * Automatically cleans up on unmount or when eventType/handler changes.
 *
 * @example
 * useEmberEvent<{ player: Player }>('player:joined', (payload) => {
 *   toast(`${payload.player.name} joined!`);
 * });
 */
export function useEmberEvent<TPayload = unknown>(
  eventType: string,
  handler: (payload: TPayload) => void
): void {
  const { client } = useEmberContext();

  useEffect(() => {
    const unsubscribe = client.onGameEvent(eventType, handler as (data: unknown) => void);
    return unsubscribe;
  }, [client, eventType, handler]);
}
