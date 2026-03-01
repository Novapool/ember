import React, { useState } from 'react';
import { useResponseInput } from '../hooks/useResponseInput';
import { C, radius } from '../utils/theme';

// ---- Types ----

export interface TextInputConfig {
  type: 'text';
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
}

export interface Choice {
  id: string;
  label: string;
  description?: string;
}

export interface MultipleChoiceConfig {
  type: 'multiple-choice';
  choices: Choice[];
  allowMultiple?: boolean;
}

export interface RankingConfig {
  type: 'ranking';
  items: Choice[];
}

export type InputConfig = TextInputConfig | MultipleChoiceConfig | RankingConfig;

export interface ResponseInputProps {
  /** Input configuration — determines mode */
  config: InputConfig;
  /** Controlled value */
  value?: string | string[];
  /** Called on every change */
  onChange?: (value: string | string[]) => void;
  /** Called when user submits */
  onSubmit?: (value: string | string[]) => void;
  /** Disable all inputs (e.g., after submitting) */
  disabled?: boolean;
  /** Show submit button */
  showSubmit?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Additional CSS classes for the root element */
  className?: string;
  /** Inline styles for the root element */
  style?: React.CSSProperties;
}

// ---- Sub-components ----

interface TextInputProps {
  config: TextInputConfig;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ config, value, onChange, onSubmit, disabled }) => {
  const [focused, setFocused] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: radius.md,
    border: `2px solid ${focused ? C.indigo500 : C.gray200}`,
    outline: 'none',
    transition: 'border-color 0.15s ease',
    color: C.gray900,
    backgroundColor: C.white,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : undefined,
    fontSize: '1rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !config.multiline && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const sharedProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    disabled,
    maxLength: config.maxLength,
    placeholder: config.placeholder || 'Type your answer…',
    style: inputStyle,
    'aria-label': 'Your response',
  };

  const counterStyle: React.CSSProperties = {
    textAlign: 'right',
    fontSize: '0.75rem',
    color: C.gray500,
    marginTop: '0.25rem',
  };

  return config.multiline ? (
    <div>
      <textarea {...sharedProps} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      {config.maxLength && (
        <div style={counterStyle}>{value.length} / {config.maxLength}</div>
      )}
    </div>
  ) : (
    <div>
      <input type="text" {...sharedProps} />
      {config.maxLength && (
        <div style={counterStyle}>{value.length} / {config.maxLength}</div>
      )}
    </div>
  );
};

interface MultipleChoiceInputProps {
  config: MultipleChoiceConfig;
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
}

const MultipleChoiceInput: React.FC<MultipleChoiceInputProps> = ({ config, value, onChange, disabled }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (config.allowMultiple) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange([id]);
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      role={config.allowMultiple ? 'group' : 'radiogroup'}
      aria-label="Answer choices"
    >
      {config.choices.map((choice) => {
        const selected = value.includes(choice.id);
        const hovered = hoveredId === choice.id && !disabled && !selected;

        let borderColor: string = C.gray200;
        let bg: string = C.white;
        let color: string = C.gray900;
        let fontWeight: number | undefined;

        if (selected) {
          borderColor = C.indigo500;
          bg = C.indigo50;
          color = C.indigo600;
          fontWeight = 600;
        } else if (hovered) {
          borderColor = C.indigo300;
        }

        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => !disabled && toggle(choice.id)}
            disabled={disabled}
            onMouseEnter={() => setHoveredId(choice.id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-pressed={selected}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.75rem 1rem',
              borderRadius: radius.md,
              border: `2px solid ${borderColor}`,
              backgroundColor: bg,
              color,
              fontWeight,
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '1rem',
            }}
          >
            <span style={{ fontWeight: 500 }}>{choice.label}</span>
            {choice.description && (
              <span style={{ display: 'block', fontSize: '0.875rem', color: C.gray500, fontWeight: 'normal', marginTop: '0.125rem' }}>
                {choice.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface RankingInputProps {
  config: RankingConfig;
  value: string[];
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}

const RankingInput: React.FC<RankingInputProps> = ({ config, value, onMoveUp, onMoveDown, onAdd, onRemove, disabled }) => {
  const ranked = value.map((id) => config.items.find((i) => i.id === id)).filter(Boolean) as Choice[];
  const unranked = config.items.filter((i) => !value.includes(i.id));

  const ctrlBtn: React.CSSProperties = {
    padding: '0.25rem',
    borderRadius: radius.sm,
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {ranked.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} aria-label="Your ranking">
          {ranked.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: radius.md,
                border: `2px solid ${C.indigo200}`,
                backgroundColor: C.indigo50,
              }}
            >
              <span
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '9999px',
                  backgroundColor: C.indigo500,
                  color: C.white,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <span style={{ flex: 1, color: C.gray900, fontWeight: 500 }}>{item.label}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => onMoveUp(index)}
                  disabled={disabled || index === 0}
                  aria-label={`Move ${item.label} up`}
                  style={{ ...ctrlBtn, opacity: disabled || index === 0 ? 0.3 : 1 }}
                >
                  <svg style={{ width: '1rem', height: '1rem', color: C.indigo600 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown(index)}
                  disabled={disabled || index === ranked.length - 1}
                  aria-label={`Move ${item.label} down`}
                  style={{ ...ctrlBtn, opacity: disabled || index === ranked.length - 1 ? 0.3 : 1 }}
                >
                  <svg style={{ width: '1rem', height: '1rem', color: C.indigo600 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  disabled={disabled}
                  aria-label={`Remove ${item.label} from ranking`}
                  style={{ ...ctrlBtn, opacity: disabled ? 0.3 : 1 }}
                >
                  <svg style={{ width: '1rem', height: '1rem', color: C.red400 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {unranked.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ranked.length > 0 && (
            <p style={{ fontSize: '0.75rem', color: C.gray500, margin: 0 }}>Tap to add to ranking:</p>
          )}
          {unranked.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => !disabled && onAdd(item.id)}
              disabled={disabled}
              aria-label={`Add ${item.label} to ranking`}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: radius.md,
                border: `2px dashed ${C.gray300}`,
                backgroundColor: C.white,
                color: C.gray500,
                transition: 'all 0.15s ease',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '1rem',
              }}
            >
              <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---- Main component ----

/**
 * Polymorphic input component for collecting player responses.
 * Supports text, multiple-choice (single or multi-select), and ranking modes.
 *
 * For custom UI with the same logic, use the `useResponseInput()` hook directly.
 */
export const ResponseInput: React.FC<ResponseInputProps> = ({
  config,
  value,
  onChange,
  onSubmit,
  disabled = false,
  showSubmit = true,
  submitLabel = 'Submit',
  className = '',
  style,
}) => {
  const [submitHovered, setSubmitHovered] = useState(false);

  const {
    value: resolvedValue,
    canSubmit,
    handleChange,
    handleSubmit,
    rankingOps,
  } = useResponseInput({ config, value, onChange, onSubmit, disabled });

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', ...style }}>
      {config.type === 'text' && (
        <TextInput
          config={config}
          value={resolvedValue as string}
          onChange={(v) => handleChange(v)}
          onSubmit={handleSubmit}
          disabled={disabled}
        />
      )}

      {config.type === 'multiple-choice' && (
        <MultipleChoiceInput
          config={config}
          value={resolvedValue as string[]}
          onChange={(v) => handleChange(v)}
          disabled={disabled}
        />
      )}

      {config.type === 'ranking' && (
        <RankingInput
          config={config}
          value={resolvedValue as string[]}
          onMoveUp={rankingOps.moveUp}
          onMoveDown={rankingOps.moveDown}
          onAdd={rankingOps.add}
          onRemove={rankingOps.remove}
          disabled={disabled}
        />
      )}

      {showSubmit && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
          onMouseEnter={() => setSubmitHovered(true)}
          onMouseLeave={() => setSubmitHovered(false)}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            borderRadius: radius.md,
            border: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            cursor: canSubmit && !disabled ? 'pointer' : 'not-allowed',
            backgroundColor: canSubmit && !disabled ? (submitHovered ? C.indigo600 : C.indigo500) : C.gray200,
            color: canSubmit && !disabled ? C.white : C.gray400,
          }}
          aria-label="Submit response"
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
};
