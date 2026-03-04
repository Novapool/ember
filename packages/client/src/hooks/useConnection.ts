import { useSyncExternalStore, useCallback } from 'react';
import { useEmberContext } from '../context/EmberProvider';
import type { ConnectionStatus } from '../types';

/**
 * Track connection status and control the socket connection.
 *
 * @example
 * const { status, isConnected, connect, disconnect } = useConnection();
 */
export function useConnection(): {
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
} {
  const { client } = useEmberContext();

  const subscribe = useCallback(
    (onStoreChange: () => void) => client.onStatusChange(onStoreChange),
    [client]
  );

  const getSnapshot = useCallback(() => client.status, [client]);

  const status = useSyncExternalStore(subscribe, getSnapshot);

  const connect = useCallback(() => client.connect(), [client]);
  const disconnect = useCallback(() => client.disconnect(), [client]);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  };
}
