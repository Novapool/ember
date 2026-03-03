/**
 * EmberProvider - React context provider for Ember client.
 *
 * Wraps the app to provide the EmberClient to all hooks.
 * Subscribes to client state/status changes for reactive rendering.
 */

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { EmberClient } from '../client/EmberClient';
import type { EmberClientConfig, ConnectionStatus } from '../types';
import type { GameState } from '@bonfire/core';

export interface EmberContextValue {
  client: EmberClient;
  status: ConnectionStatus;
  gameState: GameState | null;
}

const EmberContext = createContext<EmberContextValue | null>(null);

export interface EmberProviderProps {
  /** Pre-created EmberClient instance */
  client?: EmberClient;
  /** Config to create an EmberClient internally (ignored if client is provided) */
  config?: EmberClientConfig;
  /** Auto-connect when provider mounts (default: true) */
  autoConnect?: boolean;
  children: ReactNode;
}

export function EmberProvider({
  client: externalClient,
  config,
  autoConnect = true,
  children,
}: EmberProviderProps) {
  if (!externalClient && !config) {
    throw new Error('EmberProvider requires either a "client" or "config" prop');
  }

  const clientRef = useRef<EmberClient>(externalClient ?? new EmberClient(config!));
  const client = clientRef.current;

  const [status, setStatus] = useState<ConnectionStatus>(client.status);
  const [gameState, setGameState] = useState<GameState | null>(client.gameState);

  useEffect(() => {
    const unsubStatus = client.onStatusChange(setStatus);
    const unsubState = client.onStateChange(setGameState);

    if (autoConnect && !client.isConnected) {
      client.connect();
    }

    return () => {
      unsubStatus();
      unsubState();
      if (!externalClient) {
        client.disconnect();
      }
    };
  }, [client, autoConnect, externalClient]);

  return (
    <EmberContext.Provider value={{ client, status, gameState }}>
      {children}
    </EmberContext.Provider>
  );
}

/** Internal hook used by all public hooks to access the Ember context */
export function useEmberContext(): EmberContextValue {
  const ctx = useContext(EmberContext);
  if (!ctx) {
    throw new Error('Ember hooks must be used within an <EmberProvider>');
  }
  return ctx;
}
