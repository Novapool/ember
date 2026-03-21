# @bonfire-ember/core Package

Core types, interfaces, and base classes for the Ember party game framework.

**Status:** Milestones 1–7 Complete ✅ — stable, no breaking changes expected

---

## Package Overview

This package is the shared foundation imported by both `@bonfire-ember/server` and `@bonfire-ember/client`. It has **no runtime dependencies** — only type definitions and abstract base classes.

- **`SocialGame`** — Abstract base class that game developers extend
- **`PlayerManager`** — Composition class handling player lifecycle
- **`GameEventEmitter`** — Typed event system for game lifecycle hooks
- **`GameValidator`** — Input validation utilities
- **`IStateSynchronizer`** — Interface for backend-agnostic state sync
- **Shared contract types** (`contracts.ts`) — Response types shared between client and server

---

## Key Design Patterns

**Composition over inheritance:** `SocialGame` uses `PlayerManager` and `GameEventEmitter` as internal instances — not as parent classes. Cleaner separation of concerns, easier to test.

**Backend-agnostic via `IStateSynchronizer`:** Core has no knowledge of Socket.io, Firebase, or any network layer. `SocialGame` accepts an optional `IStateSynchronizer` instance. Tests use an in-memory implementation; production uses `SocketStateSynchronizer` from `@bonfire-ember/server`.

**Single source of truth for shared types:** Contract types (`BaseResponse`, `RoomCreateResponse`, `RoomReconnectResponse`, etc.) live in `src/contracts.ts`. Both server and client import from here — no type duplication.

**`GameState` base fields:**
- `roomId`, `phase`, `players` — always present
- `playerOrder?: PlayerId[]` — optional, for turn-based games
- `currentTurnIndex?: number` — optional, for `useTurn()` hook
- `timerEndsAt?: number` — Unix ms timestamp; set when starting a timed turn, consumed by `useCountdown()` on the client
- `metadata?: Record<string, unknown>` — game-specific config (minPlayers, maxPlayers, etc.)

---

## Directory Structure

```
src/
├── index.ts              - Barrel exports
├── types.ts              - Core type definitions (GameState, Player, GameConfig, etc.)
├── contracts.ts          - Shared request/response types (client ↔ server)
├── SocialGame.ts         - Abstract base class for game developers to extend
├── PlayerManager.ts      - Player lifecycle (join, leave, disconnect, reconnect)
├── GameEventEmitter.ts   - Typed event system
├── GameValidator.ts      - Input validation
└── StateManager.ts       - Immutable state update utilities
```

---

## Extension Pattern

```typescript
class MyGame extends SocialGame<MyGameState> {
  config = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['lobby', 'playing', 'results'],
    disconnectTimeout: 30000,
    disconnectStrategy: 'reconnect-window',
  };

  async onPlayerJoin(player: Player) { /* ... */ }
  async onPlayerLeave(playerId: string) { /* ... */ }
  async onGameStart() {
    await this.transitionPhase('playing');
  }
  async onGameEnd() { /* ... */ }
  async onPhaseChange(transition: PhaseTransition) { /* ... */ }
  async handleAction(action: PlayerAction): Promise<ActionResult> {
    // process player action, update state
    await this.updateState((s) => ({ ...s, /* changes */ }));
    return { success: true };
  }
}
```

**Protected methods available in subclasses:**
- `transitionPhase(phase)` — change phase and broadcast state
- `updateState(updater)` — update custom state fields
- `broadcastEvent(type, payload)` — push one-time custom events (e.g. `question_revealed`)

---

## Testing

- Unit tests use an `InMemoryStateSynchronizer` — no network I/O, no Socket.io
- `PlayerManager` and `GameEventEmitter` are tested independently
- 90%+ coverage target across all core classes

---

## Related Documentation

- **Architecture:** `docs/architecture/core-classes.md` — detailed class design, composition model, event system
- **Server Package:** `packages/server/CLAUDE.md` — how server uses `IStateSynchronizer`
- **Client Package:** `packages/client/CLAUDE.md` — how client consumes contract types
