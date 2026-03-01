import React, { ReactNode } from 'react';
import { C, radius, shadow } from '../utils/theme';

export type PromptVariant = 'standard' | 'spicy' | 'creative' | 'dare';

export interface PromptCardProps {
  /** The prompt or question text */
  prompt: string;
  /** Visual variant affecting color theme */
  variant?: PromptVariant;
  /** Optional category label */
  category?: string;
  /** Optional round number */
  round?: number;
  /** Total rounds for round display */
  totalRounds?: number;
  /** Optional subtitle or instructions */
  subtitle?: string;
  /** Additional content rendered below the prompt */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles for the root element */
  style?: React.CSSProperties;
  /** Inline styles for inner elements */
  styles?: {
    promptText?: React.CSSProperties;
    badge?: React.CSSProperties;
    subtitle?: React.CSSProperties;
  };
  /** Whether to animate in on mount */
  animate?: boolean;
}

const variantConfig: Record<PromptVariant, {
  borderColor: string;
  badgeBg: string;
  badgeColor: string;
  badgeText: string;
  icon: string;
}> = {
  standard: {
    borderColor: C.indigo200,
    badgeBg:    C.indigo50,
    badgeColor: C.indigo600,
    badgeText:  'Standard',
    icon: '💬',
  },
  spicy: {
    borderColor: C.red200,
    badgeBg:    C.red100,
    badgeColor: C.red700,
    badgeText:  'Spicy',
    icon: '🌶️',
  },
  creative: {
    borderColor: C.purple200,
    badgeBg:    C.purple100,
    badgeColor: C.purple700,
    badgeText:  'Creative',
    icon: '🎨',
  },
  dare: {
    borderColor: C.orange200,
    badgeBg:    C.orange100,
    badgeColor: C.orange700,
    badgeText:  'Dare',
    icon: '⚡',
  },
};

/**
 * Themed card for displaying game prompts, questions, or dares.
 * Supports multiple visual variants for different prompt types.
 */
export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  variant = 'standard',
  category,
  round,
  totalRounds,
  subtitle,
  children,
  className = '',
  style,
  styles = {},
  animate: _animate = false,
}) => {
  const cfg = variantConfig[variant];

  return (
    <div
      className={className}
      style={{
        borderRadius: radius.lg,
        border: `2px solid ${cfg.borderColor}`,
        boxShadow: shadow.md,
        padding: '1.5rem',
        backgroundColor: C.white,
        ...style,
      }}
      role="article"
      aria-label="Game prompt"
    >
      {/* Header: round info and variant badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        {round !== undefined ? (
          <span style={{ fontSize: '0.875rem', color: C.gray500 }}>
            Round {round}{totalRounds !== undefined ? ` of ${totalRounds}` : ''}
          </span>
        ) : (
          <span />
        )}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: radius.full,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: cfg.badgeBg,
            color: cfg.badgeColor,
            ...styles.badge,
          }}
        >
          <span aria-hidden="true">{cfg.icon}</span>
          {category || cfg.badgeText}
        </span>
      </div>

      {/* Prompt text */}
      <p style={{ fontSize: '1.25rem', fontWeight: 600, textAlign: 'center', lineHeight: '1.625', color: C.gray900, marginBottom: '0.5rem', marginTop: 0, ...styles.promptText }}>
        {prompt}
      </p>

      {subtitle && (
        <p style={{ fontSize: '0.875rem', textAlign: 'center', color: C.gray500, marginTop: '0.5rem', marginBottom: 0, ...styles.subtitle }}>
          {subtitle}
        </p>
      )}

      {children && <div style={{ marginTop: '1rem' }}>{children}</div>}
    </div>
  );
};
