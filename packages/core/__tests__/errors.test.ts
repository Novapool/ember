/**
 * Tests for core error classes and helpers
 *
 * Key goal: verify the prototype-chain fixups work so that instanceof checks
 * survive TypeScript transpilation.
 */

import { describe, it, expect } from 'vitest';
import {
  GameError,
  ValidationError,
  StateError,
  PlayerError,
  createValidationError,
} from '../src/validation/errors';

describe('GameError', () => {
  it('is instanceof GameError and Error', () => {
    const err = new GameError('something went wrong');
    expect(err).toBeInstanceOf(GameError);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets .name to "GameError"', () => {
    expect(new GameError('x').name).toBe('GameError');
  });

  it('uses default code GAME_ERROR', () => {
    expect(new GameError('x').code).toBe('GAME_ERROR');
  });

  it('accepts a custom code', () => {
    expect(new GameError('x', 'MY_CODE').code).toBe('MY_CODE');
  });

  it('preserves the error message', () => {
    expect(new GameError('kaboom').message).toBe('kaboom');
  });
});

describe('ValidationError', () => {
  it('is instanceof ValidationError, GameError, and Error', () => {
    const err = new ValidationError('invalid input');
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(GameError);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets .name to "ValidationError"', () => {
    expect(new ValidationError('x').name).toBe('ValidationError');
  });

  it('uses default code VALIDATION_ERROR', () => {
    expect(new ValidationError('x').code).toBe('VALIDATION_ERROR');
  });

  it('accepts a custom code', () => {
    expect(new ValidationError('x', 'FIELD_REQUIRED').code).toBe('FIELD_REQUIRED');
  });

  it('carries a details payload', () => {
    const details = { field: 'email', constraint: 'format' };
    const err = new ValidationError('bad email', 'BAD_EMAIL', details);
    expect(err.details).toEqual(details);
  });

  it('details is undefined when not provided', () => {
    expect(new ValidationError('x').details).toBeUndefined();
  });
});

describe('StateError', () => {
  it('is instanceof StateError, GameError, and Error', () => {
    const err = new StateError('bad state');
    expect(err).toBeInstanceOf(StateError);
    expect(err).toBeInstanceOf(GameError);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets .name to "StateError"', () => {
    expect(new StateError('x').name).toBe('StateError');
  });

  it('uses default code STATE_ERROR', () => {
    expect(new StateError('x').code).toBe('STATE_ERROR');
  });

  it('accepts a custom code', () => {
    expect(new StateError('x', 'INVALID_PHASE').code).toBe('INVALID_PHASE');
  });
});

describe('PlayerError', () => {
  it('is instanceof PlayerError, GameError, and Error', () => {
    const err = new PlayerError('player error');
    expect(err).toBeInstanceOf(PlayerError);
    expect(err).toBeInstanceOf(GameError);
    expect(err).toBeInstanceOf(Error);
  });

  it('sets .name to "PlayerError"', () => {
    expect(new PlayerError('x').name).toBe('PlayerError');
  });

  it('uses default code PLAYER_ERROR', () => {
    expect(new PlayerError('x').code).toBe('PLAYER_ERROR');
  });

  it('accepts a custom code', () => {
    expect(new PlayerError('x', 'PLAYER_NOT_FOUND').code).toBe('PLAYER_NOT_FOUND');
  });
});

describe('instanceof cross-class', () => {
  it('subclass instances are not instanceof sibling classes', () => {
    const v = new ValidationError('x');
    const s = new StateError('x');
    const p = new PlayerError('x');

    expect(v).not.toBeInstanceOf(StateError);
    expect(v).not.toBeInstanceOf(PlayerError);
    expect(s).not.toBeInstanceOf(ValidationError);
    expect(s).not.toBeInstanceOf(PlayerError);
    expect(p).not.toBeInstanceOf(ValidationError);
    expect(p).not.toBeInstanceOf(StateError);
  });
});

describe('createValidationError', () => {
  it('returns an object with code and message', () => {
    const result = createValidationError('MISSING_FIELD', 'Field is required');
    expect(result.code).toBe('MISSING_FIELD');
    expect(result.message).toBe('Field is required');
  });

  it('details is undefined when not provided', () => {
    const result = createValidationError('X', 'Y');
    expect(result.details).toBeUndefined();
  });

  it('includes details when provided', () => {
    const details = { field: 'username', min: 3 };
    const result = createValidationError('TOO_SHORT', 'Too short', details);
    expect(result.details).toEqual(details);
  });
});
