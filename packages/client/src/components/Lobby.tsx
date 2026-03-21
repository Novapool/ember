import React, { ReactNode, useState } from 'react';
import { useLobby } from '../hooks/useLobby';
import { PlayerAvatar } from './PlayerAvatar';
import { C, radius, shadow } from '../utils/theme';
import type { Player } from '@bonfire-ember/core';

export interface LobbyProps {
  /** Override automatic room code detection */
  roomCode?: string;
  /** Custom player rendering function */
  renderPlayer?: (player: Player, isHost: boolean) => ReactNode;
  /** Show ready states for players */
  showReadyStates?: boolean;
  /** Custom start button handler */
  onStart?: () => void | Promise<void>;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles for the root element */
  style?: React.CSSProperties;
  /** Inline styles for inner elements */
  styles?: {
    container?: React.CSSProperties;
    roomCode?: React.CSSProperties;
    playerRow?: React.CSSProperties;
    hostBadge?: React.CSSProperties;
    startButton?: React.CSSProperties;
    waitingText?: React.CSSProperties;
  };
  /** Hide the start button */
  hideStartButton?: boolean;
}

/**
 * Pre-built lobby component with room code display, player list, and start button.
 * Automatically connects to game state via hooks.
 *
 * For custom UI with the same logic, use the `useLobby()` hook directly.
 */
export const Lobby: React.FC<LobbyProps> = ({
  roomCode: overrideRoomCode,
  renderPlayer,
  showReadyStates = false,
  onStart,
  hideStartButton = false,
  className = '',
  style,
  styles = {},
}) => {
  const {
    roomCode,
    players,
    isHost,
    playerId,
    minPlayers,
    maxPlayers,
    canStart,
    isStarting,
    copied,
    handleCopyCode,
    handleStart,
  } = useLobby({ roomCode: overrideRoomCode, onStart });

  const [copyHovered, setCopyHovered] = useState(false);
  const [startHovered, setStartHovered] = useState(false);

  return (
    <div
      className={className}
      style={{
        maxWidth: '28rem',
        margin: '0 auto',
        padding: '1.5rem',
        backgroundColor: C.white,
        borderRadius: radius.md,
        boxShadow: shadow.card,
        ...style,
        ...styles.container,
      }}
      role="region"
      aria-label="Game lobby"
    >
      {/* Room Code Section */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 500, color: C.gray500, marginBottom: '0.5rem', marginTop: 0 }}>
          Room Code
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <div
            style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontFamily: 'monospace',
              color: C.indigo500,
              ...styles.roomCode,
            }}
          >
            {roomCode || '------'}
          </div>
          {roomCode && (
            <button
              onClick={handleCopyCode}
              onMouseEnter={() => setCopyHovered(true)}
              onMouseLeave={() => setCopyHovered(false)}
              style={{
                padding: '0.5rem',
                borderRadius: radius.md,
                border: 'none',
                backgroundColor: copyHovered ? C.gray100 : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Copy room code"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg data-testid="copied-icon" style={{ width: '1.5rem', height: '1.5rem', color: C.green500 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg style={{ width: '1.5rem', height: '1.5rem', color: C.gray500 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Player Count */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.875rem', color: C.gray500 }}>
          {players.length} / {maxPlayers} players
        </span>
      </div>

      {/* Player List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {players.map((player) => {
          const isPlayerHost = player.isHost;

          if (renderPlayer) {
            return <div key={player.id}>{renderPlayer(player, isPlayerHost)}</div>;
          }

          return (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: radius.md,
                backgroundColor: player.id === playerId ? C.indigo50 : C.gray100,
                ...styles.playerRow,
              }}
            >
              <PlayerAvatar name={player.name} size="md" isHost={isPlayerHost} showStatus={false} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: C.gray900 }}>
                  {player.name}
                  {player.id === playerId && (
                    <span style={{ fontSize: '0.875rem', color: C.gray500, marginLeft: '0.5rem' }}>(You)</span>
                  )}
                </div>
                {showReadyStates && (
                  <div style={{ fontSize: '0.875rem', color: C.gray500 }}>
                    {(player.metadata?.status as string) === 'ready' ? 'Ready' : 'Not ready'}
                  </div>
                )}
              </div>
              {isPlayerHost && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: C.yellow600,
                    backgroundColor: C.yellow100,
                    padding: '0.25rem 0.5rem',
                    borderRadius: radius.sm,
                    ...styles.hostBadge,
                  }}
                >
                  HOST
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      {!hideStartButton && isHost && (
        <div>
          <button
            onClick={handleStart}
            disabled={!canStart || isStarting}
            onMouseEnter={() => setStartHovered(true)}
            onMouseLeave={() => setStartHovered(false)}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              borderRadius: radius.md,
              border: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              fontFamily: 'inherit',
              color: C.white,
              transition: 'all 0.15s ease',
              cursor: canStart && !isStarting ? 'pointer' : 'not-allowed',
              backgroundColor: canStart && !isStarting
                ? (startHovered ? C.indigo600 : C.indigo500)
                : C.gray300,
              ...styles.startButton,
            }}
            aria-label="Start game"
          >
            {isStarting ? 'Starting...' : 'Start Game'}
          </button>
          {!canStart && players.length < minPlayers && (
            <p style={{ fontSize: '0.875rem', color: C.gray500, textAlign: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
              Need at least {minPlayers} players to start
            </p>
          )}
        </div>
      )}

      {/* Waiting message for non-hosts */}
      {!hideStartButton && !isHost && (
        <div style={{ textAlign: 'center', color: C.gray500, ...styles.waitingText }}>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>Waiting for host to start the game...</p>
        </div>
      )}
    </div>
  );
};
