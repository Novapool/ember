import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Lobby } from '../../src/components/Lobby';
import { renderWithProvider } from '../fixtures/renderWithProvider';
import type { GameState } from '@bonfire-ember/core';

describe('Lobby', () => {
  const mockState: GameState = {
    roomId: 'ABC123',
    phase: 'lobby',
    players: [
      { id: 'player1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
      { id: 'player2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2000 },
    ],
    metadata: {
      roomCode: 'ABC123',
      config: { minPlayers: 2, maxPlayers: 8 },
    },
  };

  it('should render room code', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('should use override room code when provided', () => {
    renderWithProvider(
      <Lobby roomCode="CUSTOM" />,
      { initialState: mockState, playerId: 'player1' }
    );
    expect(screen.getByText('CUSTOM')).toBeInTheDocument();
  });

  it('should display player count', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    expect(screen.getByText('2 / 8 players')).toBeInTheDocument();
  });

  it('should list all players', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show HOST badge for host player', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    const hostBadges = screen.getAllByText('HOST');
    expect(hostBadges).toHaveLength(1);
  });

  it('should show (You) label for current player', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('should show start button for host', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument();
  });

  it('should not show start button for non-host', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player2' });
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for host to start the game...')).toBeInTheDocument();
  });

  it('should disable start button when below minimum players', () => {
    const stateWithOnePlayer: GameState = {
      ...mockState,
      players: [
        { id: 'player1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000 },
      ],
    };

    renderWithProvider(
      <Lobby />,
      { initialState: stateWithOnePlayer, playerId: 'player1' }
    );

    const startButton = screen.getByRole('button', { name: 'Start game' });
    expect(startButton).toBeDisabled();
    expect(screen.getByText('Need at least 2 players to start')).toBeInTheDocument();
  });

  it('should enable start button when minimum players reached', () => {
    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });
    const startButton = screen.getByRole('button', { name: 'Start game' });
    expect(startButton).not.toBeDisabled();
  });

  it('should call startGame when start button clicked', async () => {
    const { mockClient } = renderWithProvider(
      <Lobby />,
      { initialState: mockState, playerId: 'player1' }
    );

    const startButton = screen.getByRole('button', { name: 'Start game' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockClient.startGame).toHaveBeenCalled();
    });
  });

  it('should call custom onStart handler when provided', async () => {
    const onStart = vi.fn().mockResolvedValue(undefined);

    renderWithProvider(
      <Lobby onStart={onStart} />,
      { initialState: mockState, playerId: 'player1' }
    );

    const startButton = screen.getByRole('button', { name: 'Start game' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(onStart).toHaveBeenCalled();
    });
  });

  it('should hide start button when hideStartButton is true', () => {
    renderWithProvider(
      <Lobby hideStartButton />,
      { initialState: mockState, playerId: 'player1' }
    );

    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for host to start the game...')).not.toBeInTheDocument();
  });

  it('should show ready states when showReadyStates is true', () => {
    const stateWithReady: GameState = {
      ...mockState,
      players: [
        { id: 'player1', name: 'Alice', isHost: true, isConnected: true, joinedAt: 1000, metadata: { status: 'ready' } },
        { id: 'player2', name: 'Bob', isHost: false, isConnected: true, joinedAt: 2000, metadata: { status: 'active' } },
      ],
    };

    renderWithProvider(
      <Lobby showReadyStates />,
      { initialState: stateWithReady, playerId: 'player1' }
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Not ready')).toBeInTheDocument();
  });

  it('should use custom renderPlayer function', () => {
    const renderPlayer = vi.fn((player, isHost) => (
      <div data-testid={`custom-${player.id}`}>
        Custom {player.name} {isHost && '(H)'}
      </div>
    ));

    renderWithProvider(
      <Lobby renderPlayer={renderPlayer} />,
      { initialState: mockState, playerId: 'player1' }
    );

    expect(screen.getByTestId('custom-player1')).toBeInTheDocument();
    expect(screen.getByTestId('custom-player2')).toBeInTheDocument();
    expect(renderPlayer).toHaveBeenCalledTimes(2);
  });

  it('should copy room code to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });

    const copyButton = screen.getByRole('button', { name: 'Copy room code' });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('ABC123');
    });
  });

  it('should show copied confirmation', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderWithProvider(<Lobby />, { initialState: mockState, playerId: 'player1' });

    const copyButton = screen.getByRole('button', { name: 'Copy room code' });
    fireEvent.click(copyButton);

    // Should show checkmark icon after copy
    await waitFor(() => {
      expect(copyButton.querySelector('[data-testid="copied-icon"]')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const { container } = renderWithProvider(
      <Lobby className="custom-class" />,
      { initialState: mockState, playerId: 'player1' }
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
