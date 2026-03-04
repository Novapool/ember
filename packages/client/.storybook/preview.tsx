import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { EmberProvider } from '../src/context/EmberProvider';
import '../src/styles/tailwind.css';

// Mock BonfireClient for Storybook stories
const createMockClient = () => {
  const stateCallbacks: Set<(state: any) => void> = new Set();
  const connectionCallbacks: Set<(status: string) => void> = new Set();

  return {
    connect: async () => {},
    disconnect: () => {},
    getState: () => ({
      players: {},
      phase: 'lobby',
      roomCode: 'ABC123',
      config: { minPlayers: 2, maxPlayers: 8 },
    }),
    getConnectionStatus: () => 'connected' as const,
    onStateChange: (callback: (state: any) => void) => {
      stateCallbacks.add(callback);
      return () => stateCallbacks.delete(callback);
    },
    onConnectionChange: (callback: (status: string) => void) => {
      connectionCallbacks.add(callback);
      return () => connectionCallbacks.delete(callback);
    },
    onEvent: () => () => {},
    createRoom: async () => ({ success: true, roomCode: 'ABC123' }),
    joinRoom: async () => ({ success: true }),
    startGame: async () => ({ success: true }),
    sendAction: async () => ({ success: true }),
    kickPlayer: async () => ({ success: true }),
    endGame: async () => ({ success: true }),
    requestState: async () => {},
  };
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => {
      const mockClient = createMockClient();
      return (
        <EmberProvider client={mockClient as any} autoConnect={false}>
          <div style={{ padding: '2rem' }}>
            <Story />
          </div>
        </EmberProvider>
      );
    },
  ],
};

export default preview;
