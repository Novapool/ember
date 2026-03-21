/**
 * @bonfire-ember/core
 *
 * Core types, interfaces, and base classes for building party games
 */

// Core types
export * from './types';

// API contracts (shared with client/server)
export * from './contracts';

// Base classes
export * from './Game';
export * from './SocialGame';

// State management
export * from './state/IStateSynchronizer';
export { StateManager } from './state/StateManager';

// Player management
export { PlayerManager } from './players/PlayerManager';

// Events
export { GameEventEmitter } from './events/EventEmitter';

// Validation
export { GameValidator } from './validation/validators';
export * from './validation/errors';
