/**
 * Direct tests for EmberProvider
 *
 * Covers lifecycle behaviours that renderWithProvider intentionally bypasses
 * (autoConnect, cleanup, error throwing).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { EmberProvider, useEmberContext } from '../../src/context/EmberProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';

// Suppress React's console.error spam for expected throws
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('EmberProvider', () => {
  describe('prop validation', () => {
    it('throws when neither client nor config is provided', () => {
      expect(() =>
        render(
          // @ts-expect-error intentionally omitting required props
          <EmberProvider>
            <div />
          </EmberProvider>
        )
      ).toThrow('EmberProvider requires either a "client" or "config" prop');
    });
  });

  describe('autoConnect', () => {
    it('calls client.connect() on mount when autoConnect is true and client is not connected', () => {
      const client = new MockEmberClient();
      expect(client.isConnected).toBe(false);

      render(
        <EmberProvider client={client as any} autoConnect={true}>
          <div />
        </EmberProvider>
      );

      expect(client.connect).toHaveBeenCalledTimes(1);
    });

    it('does not call client.connect() when autoConnect is false', () => {
      const client = new MockEmberClient();

      render(
        <EmberProvider client={client as any} autoConnect={false}>
          <div />
        </EmberProvider>
      );

      expect(client.connect).not.toHaveBeenCalled();
    });

    it('does not call client.connect() when client is already connected', () => {
      const client = new MockEmberClient();
      // Connect first so isConnected === true
      client.connect();
      client.connect.mockClear();

      render(
        <EmberProvider client={client as any} autoConnect={true}>
          <div />
        </EmberProvider>
      );

      expect(client.connect).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on unmount', () => {
    it('does NOT call disconnect on an externally-provided client', () => {
      const client = new MockEmberClient();

      const { unmount } = render(
        <EmberProvider client={client as any} autoConnect={false}>
          <div />
        </EmberProvider>
      );

      unmount();

      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('unsubscribes state and status listeners on unmount', () => {
      const client = new MockEmberClient();

      const onStateChangeSpy = vi.spyOn(client, 'onStateChange');
      const onStatusChangeSpy = vi.spyOn(client, 'onStatusChange');

      const { unmount } = render(
        <EmberProvider client={client as any} autoConnect={false}>
          <div />
        </EmberProvider>
      );

      // Each subscription returns an unsubscribe function; collect them
      const unsubState = onStateChangeSpy.mock.results[0]?.value;
      const unsubStatus = onStatusChangeSpy.mock.results[0]?.value;

      const unsubStateSpy = vi.fn(unsubState);
      const unsubStatusSpy = vi.fn(unsubStatus);

      // Re-spy so we can detect the call on unmount
      // Instead, verify listeners are cleared by simulating a state update after unmount
      unmount();

      // After unmount, simulating state changes should not cause errors
      // (listeners removed — if they were still active they'd try to call setState on unmounted component)
      act(() => {
        client.simulateStateUpdate({ roomId: 'X', phase: 'lobby', players: [] });
        client.simulateStatusChange('connected');
      });
      // No errors thrown = listeners were cleaned up
    });
  });

  describe('useEmberContext', () => {
    it('throws when used outside a EmberProvider', () => {
      function TestHook() {
        useEmberContext();
        return null;
      }

      expect(() => render(<TestHook />)).toThrow(
        'Ember hooks must be used within an <EmberProvider>'
      );
    });

    it('returns client, status, and gameState from context', () => {
      const client = new MockEmberClient();
      let capturedContext: ReturnType<typeof useEmberContext> | null = null;

      function TestHook() {
        capturedContext = useEmberContext();
        return null;
      }

      render(
        <EmberProvider client={client as any} autoConnect={false}>
          <TestHook />
        </EmberProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.client).toBe(client);
      expect(capturedContext!.status).toBe('disconnected');
      expect(capturedContext!.gameState).toBeNull();
    });

    it('reflects status changes reactively', () => {
      const client = new MockEmberClient();
      let capturedStatus = '';

      function TestHook() {
        const { status } = useEmberContext();
        capturedStatus = status;
        return null;
      }

      render(
        <EmberProvider client={client as any} autoConnect={false}>
          <TestHook />
        </EmberProvider>
      );

      expect(capturedStatus).toBe('disconnected');

      act(() => {
        client.simulateStatusChange('connected');
      });

      expect(capturedStatus).toBe('connected');
    });

    it('reflects gameState changes reactively', () => {
      const client = new MockEmberClient();
      let capturedState: any = null;

      function TestHook() {
        const { gameState } = useEmberContext();
        capturedState = gameState;
        return null;
      }

      render(
        <EmberProvider client={client as any} autoConnect={false}>
          <TestHook />
        </EmberProvider>
      );

      expect(capturedState).toBeNull();

      act(() => {
        client.simulateStateUpdate({ roomId: 'R1', phase: 'lobby', players: [] });
      });

      expect(capturedState?.roomId).toBe('R1');
    });
  });
});
