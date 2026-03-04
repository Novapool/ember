import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponseInput } from '../../src/hooks/useResponseInput';
import type { InputConfig } from '../../src/components/ResponseInput';

// useResponseInput has no EmberProvider dependency — plain renderHook works
describe('useResponseInput', () => {
  describe('text mode', () => {
    const config: InputConfig = { type: 'text', placeholder: 'Enter answer' };

    it('starts with empty string value', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      expect(result.current.value).toBe('');
      expect(result.current.canSubmit).toBe(false);
    });

    it('updates value on handleChange', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange('hello'); });
      expect(result.current.value).toBe('hello');
    });

    it('canSubmit is true when non-empty string', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange('hello'); });
      expect(result.current.canSubmit).toBe(true);
    });

    it('canSubmit is false for whitespace-only input', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange('   '); });
      expect(result.current.canSubmit).toBe(false);
    });

    it('calls onSubmit with current value', () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useResponseInput({ config, onSubmit }));
      act(() => { result.current.handleChange('answer'); });
      act(() => { result.current.handleSubmit(); });
      expect(onSubmit).toHaveBeenCalledWith('answer');
    });

    it('does not call onSubmit when canSubmit is false', () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useResponseInput({ config, onSubmit }));
      act(() => { result.current.handleSubmit(); });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not call onSubmit when disabled', () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useResponseInput({ config, onSubmit, disabled: true }));
      act(() => { result.current.handleChange('answer'); });
      act(() => { result.current.handleSubmit(); });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('calls onChange callback on handleChange', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useResponseInput({ config, onChange }));
      act(() => { result.current.handleChange('test'); });
      expect(onChange).toHaveBeenCalledWith('test');
    });

    it('reset clears the value', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange('answer'); });
      act(() => { result.current.reset(); });
      expect(result.current.value).toBe('');
    });

    it('uses controlled value when provided', () => {
      const { result } = renderHook(() =>
        useResponseInput({ config, value: 'controlled', onChange: vi.fn() })
      );
      expect(result.current.value).toBe('controlled');
    });
  });

  describe('multiple-choice mode', () => {
    const config: InputConfig = {
      type: 'multiple-choice',
      choices: [
        { id: 'a', label: 'Option A' },
        { id: 'b', label: 'Option B' },
        { id: 'c', label: 'Option C' },
      ],
    };

    it('starts with empty array', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      expect(result.current.value).toEqual([]);
      expect(result.current.canSubmit).toBe(false);
    });

    it('canSubmit is true when at least one selection', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a']); });
      expect(result.current.canSubmit).toBe(true);
    });

    it('calls onSubmit with selected ids', () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() => useResponseInput({ config, onSubmit }));
      act(() => { result.current.handleChange(['b']); });
      act(() => { result.current.handleSubmit(); });
      expect(onSubmit).toHaveBeenCalledWith(['b']);
    });

    it('reset clears selections', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a', 'c']); });
      act(() => { result.current.reset(); });
      expect(result.current.value).toEqual([]);
    });
  });

  describe('ranking mode — rankingOps', () => {
    const config: InputConfig = {
      type: 'ranking',
      items: [
        { id: 'a', label: 'Item A' },
        { id: 'b', label: 'Item B' },
        { id: 'c', label: 'Item C' },
      ],
    };

    it('starts with empty ranking', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      expect(result.current.value).toEqual([]);
    });

    it('add appends an id to ranking', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.rankingOps.add('a'); });
      expect(result.current.value).toEqual(['a']);
    });

    it('remove removes an id from ranking', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a', 'b', 'c']); });
      act(() => { result.current.rankingOps.remove('b'); });
      expect(result.current.value).toEqual(['a', 'c']);
    });

    it('moveUp swaps item with the one above', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a', 'b', 'c']); });
      act(() => { result.current.rankingOps.moveUp(1); }); // move 'b' up
      expect(result.current.value).toEqual(['b', 'a', 'c']);
    });

    it('moveUp is a no-op at index 0', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a', 'b']); });
      act(() => { result.current.rankingOps.moveUp(0); });
      expect(result.current.value).toEqual(['a', 'b']);
    });

    it('moveDown swaps item with the one below', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a', 'b', 'c']); });
      act(() => { result.current.rankingOps.moveDown(1); }); // move 'b' down
      expect(result.current.value).toEqual(['a', 'c', 'b']);
    });

    it('moveDown is a no-op at last index', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.handleChange(['a', 'b']); });
      act(() => { result.current.rankingOps.moveDown(1); });
      expect(result.current.value).toEqual(['a', 'b']);
    });

    it('canSubmit is true when at least one item ranked', () => {
      const { result } = renderHook(() => useResponseInput({ config }));
      act(() => { result.current.rankingOps.add('c'); });
      expect(result.current.canSubmit).toBe(true);
    });
  });

  describe('disabled flag', () => {
    it('exposes disabled state', () => {
      const config: InputConfig = { type: 'text' };
      const { result } = renderHook(() => useResponseInput({ config, disabled: true }));
      expect(result.current.disabled).toBe(true);
    });
  });
});
