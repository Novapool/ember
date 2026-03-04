import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useConnection } from '../../src/hooks/useConnection';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import { MockEmberClient } from '../fixtures/mockEmberClient';

describe('useConnection', () => {
  it('should return disconnected status initially', () => {
    const { result } = renderWithProvider(() => useConnection());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should reflect status changes', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useConnection(), client);

    act(() => {
      client.simulateStatusChange('connected');
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle reconnecting status', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useConnection(), client);

    act(() => {
      client.simulateStatusChange('reconnecting');
    });

    expect(result.current.status).toBe('reconnecting');
    expect(result.current.isConnected).toBe(false);
  });

  it('should call connect on the client', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useConnection(), client);

    act(() => {
      result.current.connect();
    });

    expect(client.connect).toHaveBeenCalled();
  });

  it('should call disconnect on the client', () => {
    const client = new MockEmberClient();
    const { result } = renderWithProvider(() => useConnection(), client);

    act(() => {
      result.current.disconnect();
    });

    expect(client.disconnect).toHaveBeenCalled();
  });
});
