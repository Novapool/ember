import React, { useState } from 'react';
import { C, radius } from '../utils/theme';

export interface VoteOption {
  id: string;
  label: string;
  /** Optional description */
  description?: string;
  /** Optional player name who submitted this answer */
  author?: string;
}

export interface VotingInterfaceProps {
  /** Options players can vote on */
  options: VoteOption[];
  /** ID of the currently selected option */
  currentVote?: string;
  /** Called when a user selects an option */
  onVote?: (optionId: string) => void;
  /** Disable voting (e.g., player has already voted or time is up) */
  disabled?: boolean;
  /** Show vote counts and results */
  showResults?: boolean;
  /** Map of option ID → vote count */
  voteCounts?: Record<string, number>;
  /** Total number of voters (for percentage calculation) */
  totalVoters?: number;
  /** Title shown above options */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles for the root element */
  style?: React.CSSProperties;
  /** Inline styles for inner elements */
  styles?: {
    option?: React.CSSProperties;
    voteBar?: React.CSSProperties;
    winnerBadge?: React.CSSProperties;
  };
}

interface VoteBarProps {
  count: number;
  total: number;
  style?: React.CSSProperties;
}

const VoteBar: React.FC<VoteBarProps> = ({ count, total, style }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', ...style }}>
      <div style={{ height: '0.375rem', width: '100%', backgroundColor: C.gray200, borderRadius: radius.full, overflow: 'hidden' }}>
        <div
          style={{ height: '100%', backgroundColor: C.indigo500, borderRadius: radius.full, transition: 'width 0.5s ease', width: `${pct}%` }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: C.gray500 }}>
        <span>{count} vote{count !== 1 ? 's' : ''}</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
};

/**
 * Standard voting UI for collecting player votes on a set of options.
 * Supports result display with vote counts and percentages.
 */
export const VotingInterface: React.FC<VotingInterfaceProps> = ({
  options,
  currentVote,
  onVote,
  disabled = false,
  showResults = false,
  voteCounts = {},
  totalVoters = 0,
  title,
  className = '',
  style,
  styles = {},
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const maxVotes = showResults
    ? Math.max(0, ...options.map((o) => voteCounts[o.id] ?? 0))
    : 0;

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}
      role="radiogroup"
      aria-label={title || 'Vote options'}
    >
      {title && (
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: C.gray900, textAlign: 'center', marginBottom: '0.5rem', marginTop: 0 }}>
          {title}
        </h2>
      )}

      {options.map((option) => {
        const selected = currentVote === option.id;
        const count = voteCounts[option.id] ?? 0;
        const isWinner = showResults && count === maxVotes && maxVotes > 0;
        const hovered = hoveredId === option.id && !disabled && !selected && !isWinner;

        let borderColor: string = hovered ? C.indigo200 : C.gray200;
        let bg: string = C.white;
        let labelColor: string = C.gray900;

        if (selected) {
          borderColor = C.indigo500;
          bg = C.indigo50;
          labelColor = C.indigo600;
        } else if (isWinner) {
          borderColor = C.yellow400;
          bg = C.yellow50;
          labelColor = C.yellow700;
        }

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => !disabled && onVote?.(option.id)}
            disabled={disabled && !showResults}
            onMouseEnter={() => setHoveredId(option.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '1rem 1.25rem',
              borderRadius: radius.lg,
              border: `2px solid ${borderColor}`,
              backgroundColor: bg,
              transition: 'all 0.15s ease',
              opacity: disabled && !showResults ? 0.6 : 1,
              cursor: disabled && !showResults ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '1rem',
              ...styles.option,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, display: 'block', color: labelColor }}>
                  {isWinner && <span aria-hidden="true" style={{ marginRight: '0.25rem', ...styles.winnerBadge }}>🏆</span>}
                  {option.label}
                </span>
                {option.description && (
                  <span style={{ fontSize: '0.875rem', color: C.gray500, display: 'block', marginTop: '0.125rem' }}>
                    {option.description}
                  </span>
                )}
                {option.author && (
                  <span style={{ fontSize: '0.75rem', color: C.gray500, display: 'block', marginTop: '0.125rem' }}>
                    — {option.author}
                  </span>
                )}
              </div>
              {selected && !showResults && (
                <span
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: radius.full,
                    backgroundColor: C.indigo500,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '0.125rem',
                  }}
                  aria-hidden="true"
                >
                  <svg style={{ width: '0.75rem', height: '0.75rem', color: C.white }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
            {showResults && <VoteBar count={count} total={totalVoters} style={styles.voteBar} />}
          </button>
        );
      })}
    </div>
  );
};
