import React, { useState, useEffect, useRef } from 'react';
import { C } from '../utils/theme';

export interface TimerProps {
  /** Duration in seconds */
  duration: number;
  /** Callback when timer completes */
  onComplete?: () => void;
  /** Show circular progress ring */
  showProgress?: boolean;
  /** Visual variant */
  variant?: 'default' | 'warning' | 'danger';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Inline styles for the root element */
  style?: React.CSSProperties;
  /** Inline styles for inner elements */
  styles?: {
    ring?: React.CSSProperties;
    timeText?: React.CSSProperties;
  };
  /** Auto-start timer on mount */
  autoStart?: boolean;
}

const sizeDims: Record<NonNullable<TimerProps['size']>, React.CSSProperties> = {
  sm: { width: '4rem',  height: '4rem',  fontSize: '1.125rem' },
  md: { width: '6rem',  height: '6rem',  fontSize: '1.875rem' },
  lg: { width: '8rem',  height: '8rem',  fontSize: '3rem' },
};

const variantColors: Record<NonNullable<TimerProps['variant']>, string> = {
  default: C.indigo500,
  warning: C.amber500,
  danger:  C.red500,
};

/**
 * Countdown timer with visual feedback and optional progress ring.
 * Automatically transitions between variants based on remaining time.
 */
export const Timer: React.FC<TimerProps> = ({
  duration,
  onComplete,
  showProgress = true,
  variant: initialVariant = 'default',
  size = 'md',
  className = '',
  style,
  styles = {},
  autoStart = true,
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const getVariant = (): 'default' | 'warning' | 'danger' => {
    if (initialVariant !== 'default') return initialVariant;
    const pct = (timeLeft / duration) * 100;
    if (pct <= 25) return 'danger';
    if (pct <= 50) return 'warning';
    return 'default';
  };

  const currentVariant = getVariant();

  useEffect(() => {
    if (!isRunning) return;

    startTimeRef.current = performance.now();
    const initialTimeLeft = timeLeft;

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current!) / 1000;
      const newTimeLeft = Math.max(0, initialTimeLeft - elapsed);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsRunning(false);
        onComplete?.();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRunning, timeLeft, onComplete]);

  const displayTime = Math.ceil(timeLeft);
  const progress = (timeLeft / duration) * 100;

  const r = size === 'sm' ? 28 : size === 'md' ? 44 : 60;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sizeDims[size],
        ...style,
      }}
      role="timer"
      aria-live="polite"
      aria-label={`${displayTime} seconds remaining`}
    >
      {showProgress && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', ...styles.ring }}
          viewBox={`0 0 ${r * 2 + 8} ${r * 2 + 8}`}
        >
          {/* Background circle */}
          <circle
            cx={r + 4}
            cy={r + 4}
            r={r}
            stroke={C.gray200}
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={r + 4}
            cy={r + 4}
            r={r}
            stroke={variantColors[currentVariant]}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'all 0.3s linear' }}
          />
        </svg>
      )}

      <span style={{ fontWeight: 700, color: variantColors[currentVariant], position: 'relative', zIndex: 1, ...styles.timeText }}>
        {displayTime}
      </span>
    </div>
  );
};
