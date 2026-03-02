import { useState, useEffect } from 'react';

/**
 * Returns seconds remaining (≥ 0) until a given Unix ms timestamp, updating every second.
 *
 * Synchronized to an absolute timestamp, so all clients show the same remaining time
 * regardless of when they mounted.
 *
 * @param timerEndsAt - Unix ms timestamp when the timer expires. Pass null/undefined to return 0.
 * @returns Seconds remaining (integer, ≥ 0). Returns 0 when expired or when timerEndsAt is falsy.
 *
 * @example
 * // In state: timerEndsAt = Date.now() + 90_000
 * const secondsLeft = useCountdown(state.timerEndsAt);
 * // Renders: <span>{secondsLeft}s</span>
 */
export function useCountdown(timerEndsAt: number | null | undefined): number {
  const getSecondsLeft = () => {
    if (!timerEndsAt) return 0;
    return Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);

  useEffect(() => {
    if (!timerEndsAt) {
      setSecondsLeft(0);
      return;
    }

    setSecondsLeft(getSecondsLeft());

    const interval = setInterval(() => {
      const remaining = getSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerEndsAt]);

  return secondsLeft;
}
