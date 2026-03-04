/**
 * Test helper: renders a hook or component within a EmberProvider backed by a MockEmberClient.
 */

import { render, renderHook, type RenderHookOptions, type RenderOptions } from '@testing-library/react';
import type { ReactNode, ReactElement } from 'react';
import { EmberProvider } from '../../src/context/EmberProvider';
import { MockEmberClient } from './mockEmberClient';
import type { GameState, PlayerId } from '@bonfire/core';

// Overloaded signatures for different use cases
export function renderWithProvider<TResult>(
  hook: () => TResult,
  mockClient?: MockEmberClient,
  options?: Omit<RenderHookOptions<unknown>, 'wrapper'>
): ReturnType<typeof renderHook<TResult>> & { client: MockEmberClient };

export function renderWithProvider(
  ui: ReactElement,
  options?: {
    mockClient?: MockEmberClient;
    initialState?: GameState;
    playerId?: PlayerId;
  } & Omit<RenderOptions, 'wrapper'>
): ReturnType<typeof render> & { mockClient: MockEmberClient };

// Implementation
export function renderWithProvider<TResult>(
  hookOrUi: (() => TResult) | ReactElement,
  optionsOrClient?: MockEmberClient | any,
  hookOptions?: Omit<RenderHookOptions<unknown>, 'wrapper'>
): any {
  // Determine if we're rendering a hook or a component
  const isHook = typeof hookOrUi === 'function';

  if (isHook) {
    // Hook rendering (original behavior)
    const client = optionsOrClient ?? new MockEmberClient();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <EmberProvider client={client as any} autoConnect={false}>
        {children}
      </EmberProvider>
    );

    const result = renderHook(hookOrUi, { wrapper, ...hookOptions });
    return { ...result, client };
  } else {
    // Component rendering (new behavior)
    const {
      mockClient,
      initialState,
      playerId,
      ...renderOptions
    } = optionsOrClient || {};

    const client = mockClient ?? new MockEmberClient();

    // Set up initial state if provided
    if (initialState) {
      client.simulateStateUpdate(initialState);
    }
    if (playerId) {
      client.setPlayerId(playerId);
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <EmberProvider client={client as any} autoConnect={false}>
        {children}
      </EmberProvider>
    );

    const result = render(hookOrUi, { wrapper, ...renderOptions });
    return { ...result, mockClient: client };
  }
}
