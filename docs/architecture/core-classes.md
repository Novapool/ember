# Core Classes - Architecture Documentation

This document describes the core classes that make up the Ember framework engine, their responsibilities, relationships, and design decisions.

## Overview

The Ember core is built around several key classes that work together to provide game lifecycle management, player handling, event propagation, and state synchronization:

```
Game (abstract base)
  └── SocialGame (concrete implementation)
        ├── PlayerManager (composition)
        ├── GameEventEmitter (composition)
        ├── StateManager (utility)
        ├── GameValidator (utility)
        └── IStateSynchronizer (optional interface)
```

## SocialGame Class

**Location:** `/packages/core/src/SocialGame.ts`

**Purpose:** Main deliverable - the concrete game class that developers extend to build their party games.

**Responsibilities:**
- Player lifecycle management (join, leave, disconnect, reconnect)
- Game lifecycle (start, end, close room)
- Phase transitions and state updates
- Event emission for all lifecycle hooks
- State synchronization with optional backend
- Input validation via GameValidator

**Key Features:**

1. **Player Management:**
   - `joinPlayer()` - Add players with validation
   - `leavePlayer()` - Remove players
   - `disconnectPlayer()` - Handle temporary disconnects with configurable timeout
   - `reconnectPlayer()` - Restore disconnected players

2. **Game Lifecycle:**
   - `startGame()` - Begin the game with validation
   - `endGame()` - End the game
   - `closeRoom()` - Cleanup resources
   - Room status tracking (waiting/playing/ended/closed)

3. **Event System:**
   - Typed events for all lifecycle hooks
   - Subscribe with `on()`, unsubscribe with `off()`
   - Events: player:joined, player:left, player:disconnected, player:reconnected, game:started, game:ended, phase:changed, room:closed

4. **State Management:**
   - Optional `IStateSynchronizer` for backend integration
   - Immutable state updates via StateManager
   - Automatic state broadcasting
   - `protected transitionPhase(phase)` - Change game phase and broadcast state
   - `protected updateState(updater)` - Update game-specific state fields
   - `protected broadcastEvent(type, payload)` - Push custom game events to all clients (e.g. `question_revealed`, `round_ended`)
   - Base `GameState` includes `playerOrder?: PlayerId[]` for turn-based games
   - Base `GameState` includes `timerEndsAt?: number` — Unix ms timestamp when the current turn timer expires; pair with `useCountdown(state.timerEndsAt)` on the client for synchronized countdowns across all players

**Extension Pattern:**

Game developers extend SocialGame and implement 6 lifecycle hooks:

```typescript
class MyGame extends SocialGame<MyGameState> {
  config = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['lobby', 'playing', 'results'],
    disconnectTimeout: 30000,
  };

  async onPlayerJoin(player: Player) { /* ... */ }
  async onPlayerLeave(playerId: string) { /* ... */ }
  async onGameStart() { /* ... */ }
  async onGameEnd() { /* ... */ }
  async onPhaseChange(transition: PhaseTransition) { /* ... */ }
  async handleAction(action: PlayerAction): Promise<ActionResult> { /* ... */ }
}
```

**Design Decisions:**
- Uses composition (PlayerManager, EventEmitter) over deep inheritance
- Lazy initialization of PlayerManager (only created when needed)
- Backend-agnostic via optional IStateSynchronizer interface
- Type-safe event system with generic payloads
- Immutable state updates to prevent accidental mutations

## PlayerManager Class

**Location:** `/packages/core/src/players/PlayerManager.ts`

**Purpose:** Handles complex player connection lifecycle and timeout management.

**Responsibilities:**
- Track player connection state
- Manage disconnect timeout timers
- Automatically remove players after timeout expires
- Handle reconnection logic with timeout cancellation
- Notify game of player state changes

**Key Features:**
- Per-player timeout tracking
- Automatic cleanup of disconnected players
- Reconnection cancels pending removal
- Configurable disconnect timeout (default: 30 seconds)

**Internal State:**
- Map of player IDs to timeout timer IDs
- Tracks which players are in "disconnected" state
- Coordinates with SocialGame for lifecycle events

**Why it exists:** Disconnect handling is complex and error-prone (timers, race conditions, cleanup). Extracting this to a dedicated class keeps SocialGame focused on game logic.

## GameEventEmitter Class

**Location:** `/packages/core/src/events/EventEmitter.ts`

**Purpose:** Type-safe event emitter for game lifecycle events.

**Responsibilities:**
- Register event listeners
- Emit events with typed payloads
- Support for one-time listeners (`once()`)
- Async event handler support
- Event listener cleanup

**Features:**
- Generic typed events: `EventEmitter<TEventMap>`
- Full type safety: can't emit invalid event names or payloads
- Support for `on()`, `off()`, `once()`
- Async handler support (awaits all handlers)
- Prevents memory leaks via proper cleanup

**Design Decision:** Built custom instead of using Node's EventEmitter for:
- Full TypeScript type safety
- Zero dependencies in core package
- Browser compatibility (no Node.js dependencies)
- Simpler API tailored to game needs

## GameValidator Utility

**Location:** `/packages/core/src/validation/validators.ts`

**Purpose:** Centralized validation logic for game rules and state transitions.

**Validation Rules:**
1. **Player Join Validation:**
   - No duplicate player IDs
   - Game not full (under maxPlayers)
   - Game hasn't started (unless allowJoinInProgress)
   - Player object is valid

2. **Game Start Validation:**
   - Minimum players present
   - Game hasn't already started
   - Game is in valid starting phase

3. **Phase Transition Validation:**
   - Target phase is in allowed phases list
   - Phase transition makes sense

4. **Player Existence Checks:**
   - Player exists before operations
   - Player is actually disconnected before reconnect

5. **Game End Validation:**
   - Game has actually started
   - Game hasn't already ended

**Design Decision:** Extracted validation to utility class (not methods on SocialGame) for:
- Easier testing in isolation
- Reusable across different game implementations
- Separation of concerns (validation vs. execution)
- Clear error messages

## StateManager Utility

**Location:** `/packages/core/src/state/StateManager.ts`

**Purpose:** Helper functions for immutable state management.

**Functions:**
- Immutable state updates (deep cloning)
- State validation
- Deep state cloning

**Why immutability:**
- Prevents accidental state mutations
- Makes state changes explicit
- Easier debugging (can compare old vs new state)
- Safer with async operations

## IStateSynchronizer Interface

**Location:** `/packages/core/src/state/IStateSynchronizer.ts`

**Purpose:** Backend-agnostic interface for state synchronization.

**Interface:**
```typescript
interface IStateSynchronizer<TState extends GameState> {
  broadcastState(state: TState): Promise<void>;
  sendToPlayer(playerId: string, state: TState): Promise<void>;
  broadcastEvent<K extends GameEventType>(event: K, payload: GameEventPayloads[K]): Promise<void>;
  broadcastCustomEvent(type: string, payload: unknown): Promise<void>;
}
```

**Why optional:** Core package should work standalone (no backend dependency). Server implementations (Firebase, Railway) will provide concrete implementations.

**Usage:** Pass synchronizer to SocialGame constructor:
```typescript
const game = new MyGame('room-123', initialState, mySynchronizer);
```

## Error Classes

**Location:** `/packages/core/src/validation/errors.ts`

**Purpose:** Custom error types for better error handling.

**Error Types:**
- `GameError` - Base error class
- `ValidationError` - Validation failures
- `StateError` - State-related issues
- `PlayerError` - Player operation errors

**Why custom errors:** Allows consumers to handle different error types differently (e.g., validation errors vs. system errors).

## Class Relationships

**Composition (SocialGame has-a):**
- PlayerManager - Handles player lifecycle
- GameEventEmitter - Emits typed events
- IStateSynchronizer (optional) - Syncs state to backend

**Utilities (SocialGame uses):**
- GameValidator - Validates operations
- StateManager - Updates state immutably

**Inheritance (Developer extends):**
- Game (abstract) ← SocialGame (concrete) ← MyGame (developer's game)

## Test Coverage

**Test Files:**
- `EventEmitter.test.ts` - 10 tests for event system
- `validators.test.ts` - 18 tests for validation logic
- `PlayerManager.test.ts` - 14 tests with fake timers for disconnect handling
- `StateManager.test.ts` - 24 tests for updateState, cloneState, validateStateUpdate
- `SocialGame.test.ts` - 57 tests for complete API (incl. transitionPhase, updateState, error paths)
- `integration.test.ts` - 6 tests for full game lifecycle scenarios

**Total:** 131 tests, ~92% statement coverage, ~93% function coverage

**Key Test Scenarios:**
- Player join/leave/disconnect/reconnect flows
- Game start/end validation
- Phase transitions
- Event emission and listening
- State synchronization
- Timeout handling
- Multiplayer scenarios
- Rapid concurrent actions
- Error handling

## File Structure

```
packages/core/
├── src/
│   ├── Game.ts                      # Abstract base class
│   ├── SocialGame.ts                # Main concrete implementation
│   ├── types.ts                     # Type definitions
│   ├── index.ts                     # Public exports
│   ├── events/
│   │   └── EventEmitter.ts          # Typed event system
│   ├── validation/
│   │   ├── errors.ts                # Custom error classes
│   │   └── validators.ts            # Validation logic
│   ├── state/
│   │   ├── IStateSynchronizer.ts    # Backend interface
│   │   └── StateManager.ts          # State utilities
│   └── players/
│       └── PlayerManager.ts         # Player lifecycle
└── __tests__/
    ├── helpers.ts                   # Test utilities
    ├── EventEmitter.test.ts
    ├── validators.test.ts
    ├── PlayerManager.test.ts
    ├── SocialGame.test.ts
    └── integration.test.ts
```

## Key Achievements

1. **Backend Agnostic:** Zero runtime dependencies. Server implementations will be separate packages.

2. **Type Safety:** Full TypeScript support with typed events, state, and payloads.

3. **Disconnect Handling:** Robust player reconnection with configurable timeouts - critical for mobile games.

4. **Event-Driven:** Extensible event system allows logging, analytics, and debugging without modifying core classes.

5. **Well-Tested:** Comprehensive test suite covering edge cases, concurrent operations, and integration scenarios.

6. **Developer Experience:** Clean API, minimal boilerplate, clear extension points.

## What Game Developers Get

By extending `SocialGame`, developers automatically get:

- Automatic player management
- Connection state tracking
- Disconnect/reconnect handling
- Game lifecycle (start/end)
- Phase management
- Event system for all hooks
- Validation (player limits, game state)
- Optional backend sync
- Type-safe state management

**Developers only need to:**
1. Define their game state interface
2. Set config (min/max players, phases, timeout)
3. Implement 6 lifecycle hooks
4. Handle player actions

Everything else is handled by the framework.

## Performance Characteristics

**Lines of Code:**
- Source: ~800 LOC
- Tests: ~1000 LOC
- Total: ~1800 LOC

**Build Output:**
- TypeScript compilation: Clean, no errors
- Type definitions: Generated for full IDE support
- Bundle size: Minimal (no dependencies)

**Runtime:**
- PlayerManager uses timers efficiently (one per disconnected player)
- Event emission is async but non-blocking
- State updates are immutable (clone cost acceptable for game state sizes)
- No polling or intervals (fully event-driven)

## Future Considerations

**Potential Enhancements:**
- Add state history/undo functionality
- Add replay/time-travel debugging
- Performance monitoring hooks
- Rate limiting on player actions
- Spectator mode support
- Save/restore game state

**Migration Path:**
When backend integrations are built (Milestone 3), they will:
- Implement IStateSynchronizer interface
- Live in separate packages (@bonfire/firebase, @bonfire/railway)
- Not require changes to core package
- Allow games to switch backends without code changes
