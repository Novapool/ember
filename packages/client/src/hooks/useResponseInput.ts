import { useState, useCallback } from 'react';
import type { InputConfig } from '../components/ResponseInput';

export interface UseResponseInputOptions {
  config: InputConfig;
  /** Controlled value — if provided, the hook uses this instead of internal state */
  value?: string | string[];
  /** Called on every change */
  onChange?: (value: string | string[]) => void;
  /** Called when the user submits */
  onSubmit?: (value: string | string[]) => void;
  /** Disable all interactions */
  disabled?: boolean;
}

export interface RankingOps {
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
}

export interface UseResponseInputReturn {
  value: string | string[];
  canSubmit: boolean;
  disabled: boolean;
  handleChange: (v: string | string[]) => void;
  handleSubmit: () => void;
  reset: () => void;
  /** Only relevant when config.type === 'ranking' */
  rankingOps: RankingOps;
}

function defaultValue(config: InputConfig): string | string[] {
  return config.type === 'text' ? '' : [];
}

/**
 * Headless hook containing all ResponseInput business logic.
 * Use this when you want the input state and handlers but supply your own markup.
 *
 * @example
 * const { value, canSubmit, handleChange, handleSubmit, rankingOps } = useResponseInput({
 *   config: { type: 'text', placeholder: 'Your answer' },
 *   onSubmit: (v) => sendAction('submit', { answer: v }),
 * });
 */
export function useResponseInput({
  config,
  value: controlledValue,
  onChange,
  onSubmit,
  disabled = false,
}: UseResponseInputOptions): UseResponseInputReturn {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string | string[]>(() => defaultValue(config));

  const value: string | string[] = isControlled ? controlledValue! : internalValue;

  const handleChange = useCallback(
    (v: string | string[]) => {
      if (!isControlled) setInternalValue(v);
      onChange?.(v);
    },
    [isControlled, onChange]
  );

  const canSubmit = config.type === 'text'
    ? (value as string).trim().length > 0
    : (value as string[]).length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit || disabled) return;
    onSubmit?.(value);
  }, [canSubmit, disabled, onSubmit, value]);

  const reset = useCallback(() => {
    const empty = defaultValue(config);
    if (!isControlled) setInternalValue(empty);
    onChange?.(empty);
  }, [config, isControlled, onChange]);

  // ---- Ranking ops ----

  const rankingMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...(value as string[])];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      handleChange(next);
    },
    [value, handleChange]
  );

  const rankingMoveDown = useCallback(
    (index: number) => {
      const arr = value as string[];
      if (index === arr.length - 1) return;
      const next = [...arr];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      handleChange(next);
    },
    [value, handleChange]
  );

  const rankingAdd = useCallback(
    (id: string) => {
      handleChange([...(value as string[]), id]);
    },
    [value, handleChange]
  );

  const rankingRemove = useCallback(
    (id: string) => {
      handleChange((value as string[]).filter((v) => v !== id));
    },
    [value, handleChange]
  );

  return {
    value,
    canSubmit,
    disabled,
    handleChange,
    handleSubmit,
    reset,
    rankingOps: {
      moveUp: rankingMoveUp,
      moveDown: rankingMoveDown,
      add: rankingAdd,
      remove: rankingRemove,
    },
  };
}
