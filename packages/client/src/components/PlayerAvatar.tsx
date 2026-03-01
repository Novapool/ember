import React from 'react';
import { getPlayerColor, getPlayerInitials } from '../utils/colorHash';
import { C, radius } from '../utils/theme';

export interface PlayerAvatarProps {
  /** Player name to display */
  name: string;
  /** Override auto-generated color */
  color?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show online status indicator */
  showStatus?: boolean;
  /** Online status (only shown if showStatus is true) */
  isOnline?: boolean;
  /** Show host crown icon */
  isHost?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles for the root element (merged with internal styles) */
  style?: React.CSSProperties;
  /** Inline styles for inner elements */
  styles?: {
    statusDot?: React.CSSProperties;
    crownBadge?: React.CSSProperties;
  };
}

const sizeDims: Record<NonNullable<PlayerAvatarProps['size']>, React.CSSProperties> = {
  xs: { width: '1.5rem', height: '1.5rem', fontSize: '0.75rem' },
  sm: { width: '2rem',   height: '2rem',   fontSize: '0.875rem' },
  md: { width: '3rem',   height: '3rem',   fontSize: '1rem' },
  lg: { width: '4rem',   height: '4rem',   fontSize: '1.25rem' },
  xl: { width: '6rem',   height: '6rem',   fontSize: '1.875rem' },
};

const statusDims: Record<NonNullable<PlayerAvatarProps['size']>, React.CSSProperties> = {
  xs: { width: '0.375rem', height: '0.375rem', borderWidth: '1px' },
  sm: { width: '0.5rem',   height: '0.5rem',   borderWidth: '1px' },
  md: { width: '0.625rem', height: '0.625rem', borderWidth: '2px' },
  lg: { width: '0.75rem',  height: '0.75rem',  borderWidth: '2px' },
  xl: { width: '1rem',     height: '1rem',     borderWidth: '2px' },
};

const crownDims: Record<NonNullable<PlayerAvatarProps['size']>, React.CSSProperties> = {
  xs: { width: '0.75rem', height: '0.75rem', top: '-0.25rem',  right: '-0.25rem' },
  sm: { width: '1rem',    height: '1rem',    top: '-0.375rem', right: '-0.375rem' },
  md: { width: '1.25rem', height: '1.25rem', top: '-0.5rem',   right: '-0.5rem' },
  lg: { width: '1.5rem',  height: '1.5rem',  top: '-0.5rem',   right: '-0.5rem' },
  xl: { width: '2rem',    height: '2rem',    top: '-0.75rem',  right: '-0.75rem' },
};

/**
 * PlayerAvatar component displays a player's avatar with initials and color.
 * Supports online status indicator and host crown badge.
 */
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  color,
  size = 'md',
  showStatus = false,
  isOnline = false,
  isHost = false,
  className = '',
  style,
  styles = {},
}) => {
  const initials = getPlayerInitials(name);
  const backgroundColor = color || getPlayerColor(name);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        fontWeight: 600,
        color: C.white,
        userSelect: 'none',
        flexShrink: 0,
        backgroundColor,
        ...sizeDims[size],
        ...style,
      }}
      title={name}
      role="img"
      aria-label={`${name}${isHost ? ' (host)' : ''}${showStatus ? ` (${isOnline ? 'online' : 'offline'})` : ''}`}
    >
      <span>{initials}</span>

      {showStatus && (
        <span
          data-testid="status-indicator"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            borderRadius: radius.full,
            borderStyle: 'solid',
            borderColor: C.white,
            backgroundColor: isOnline ? C.green500 : C.gray400,
            ...statusDims[size],
            ...styles.statusDot,
          }}
          aria-hidden="true"
        />
      )}

      {isHost && (
        <span
          style={{
            position: 'absolute',
            borderRadius: radius.full,
            backgroundColor: C.yellow400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...crownDims[size],
            ...styles.crownBadge,
          }}
          aria-hidden="true"
          title="Host"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: '75%', height: '75%', color: C.yellow600 }}
          >
            <path d="M12 2L15 8.5L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L9 8.5L12 2Z" />
          </svg>
        </span>
      )}
    </div>
  );
};
