# @bonfire/client Package

React hooks and utilities for building Ember party game UIs.

**Status:** Milestone 4 + 5 + 7 Complete ✅ - 242 tests, all passing

---

## Package Overview

This package provides the client-side React integration for Bonfire games:
- **EmberClient** - Socket.io wrapper with Promise-based API and subscription model
- **EmberProvider** - React context provider for client access
- **11 React hooks** - 7 game-state hooks + 2 headless component hooks (`useLobby`, `useResponseInput`) + 2 utility hooks (`useCountdown`, `useSession`)
- **EmberErrorBoundary** - Error boundary component for graceful error handling
- **8 UI components** - Lobby, PlayerAvatar, Timer, PromptCard, ResponseInput, RevealPhase, GameProgress, VotingInterface
- **`styles` prop** - All 5 complex components accept a `styles` object for inner-element theming (see `docs/DUAL_USE_GUIDE.md`)
- **colorHash utility** - Deterministic player color generation from names
- **Storybook 8** - Interactive component documentation
- **Inline styles** - Components use inline styles via a shared `src/utils/theme.ts` token file. No Tailwind required — components render correctly with zero consumer setup
- **MockEmberClient** - Test utility for simulating client behavior

---

## Directory Structure

```
src/
├── index.ts                          - Package exports
├── types.ts                          - Client type definitions
├── client/
│   └── EmberClient.ts                - Core Socket.io client wrapper
├── context/
│   └── EmberProvider.tsx             - React context provider
├── hooks/
│   ├── useGameState.ts               - Game state subscription hook
│   ├── useConnection.ts              - Connection status and control
│   ├── useRoom.ts                    - Room management and actions
│   ├── usePlayer.ts                  - Player data and derived state
│   ├── usePhase.ts                   - Current phase tracking
│   ├── useEmberEvent.ts              - Custom event subscription
│   ├── useTurn.ts                    - Turn-based game helper (isMyTurn, currentPlayer)
│   ├── useLobby.ts                   - Headless Lobby logic (roomCode, players, canStart, handlers)
│   ├── useResponseInput.ts           - Headless ResponseInput logic (value, canSubmit, rankingOps)
│   ├── useCountdown.ts               - Synchronized countdown timer (pairs with state.timerEndsAt)
│   └── useSession.ts                 - Page-refresh reconnect automation (isRestoring, restored, failed)
├── components/
│   ├── EmberErrorBoundary.tsx        - Error boundary component
│   ├── Lobby.tsx                     - Pre-built lobby screen (room code, players, start)
│   ├── Lobby.stories.tsx
│   ├── PlayerAvatar.tsx              - Player avatar (initials, color, status, host crown)
│   ├── PlayerAvatar.stories.tsx
│   ├── Timer.tsx                     - Countdown with SVG progress ring
│   ├── Timer.stories.tsx
│   ├── PromptCard.tsx                - Themed prompt card (4 variants)
│   ├── PromptCard.stories.tsx
│   ├── ResponseInput.tsx             - Polymorphic input (text/multiple-choice/ranking)
│   ├── ResponseInput.stories.tsx
│   ├── RevealPhase.tsx               - Sequential animated item reveal
│   ├── RevealPhase.stories.tsx
│   ├── GameProgress.tsx              - Progress indicator (bar/dots/number)
│   ├── GameProgress.stories.tsx
│   ├── VotingInterface.tsx           - Voting UI with results display
│   └── VotingInterface.stories.tsx
└── utils/
    ├── colorHash.ts                  - Deterministic color & initials from player name
    └── theme.ts                      - Shared inline style constants (colors, radius, shadows)

__tests__/
├── client/
│   └── EmberClient.test.ts           - Client class tests
├── hooks/
│   ├── useGameState.test.ts
│   ├── useConnection.test.ts
│   ├── useRoom.test.ts
│   ├── usePlayer.test.ts
│   ├── usePhase.test.ts
│   ├── useEmberEvent.test.ts
│   ├── useCountdown.test.ts
│   └── useSession.test.ts
├── components/
│   ├── EmberErrorBoundary.test.tsx
│   ├── Lobby.test.tsx
│   ├── PlayerAvatar.test.tsx
│   ├── Timer.test.tsx
│   ├── PromptCard.test.tsx
│   ├── ResponseInput.test.tsx
│   ├── RevealPhase.test.tsx
│   ├── GameProgress.test.tsx
│   └── VotingInterface.test.tsx
└── fixtures/
    ├── mockEmberClient.ts            - Mock client for testing
    └── renderWithProvider.tsx        - Test render utility
```

---

## When to Read What

**README.md** - API reference and usage examples
- Read when: Integrating Ember into a React app, learning the API, implementing game UIs

**types.ts** - Client type definitions
- Read when: Understanding client types, working with TypeScript, implementing custom types

**client/EmberClient.ts** - Core client implementation
- Read when: Understanding client internals, debugging connection issues, extending functionality

**context/EmberProvider.tsx** - React context setup
- Read when: Understanding how hooks access the client, debugging context issues

**hooks/** - Individual hook implementations
- Read when: Understanding hook behavior, debugging hook issues, implementing custom hooks

**components/EmberErrorBoundary.tsx** - Error boundary
- Read when: Implementing error handling, customizing error displays

**fixtures/mockEmberClient.ts** - Test utilities
- Read when: Writing tests for components that use Ember hooks

---

## Key Patterns & Conventions

### Architecture Patterns
- **useSyncExternalStore** - All hooks use React 18's `useSyncExternalStore` for external state synchronization
  - Ensures tear-free reads in concurrent mode
  - Prevents stale state from race conditions
  - Efficient re-renders only when subscribed data changes
- **Subscription model** - EmberClient uses subscription callbacks rather than React state
  - Decouples client from React (can be used outside React)
  - Enables testing without React rendering
  - Hooks subscribe to client and convert to React state
- **Promise-based API** - All async operations return Promises
  - `createRoom()`, `joinRoom()`, `sendAction()`, etc.
  - Allows error handling with try/catch
  - Integrates with async/await patterns

### Code Conventions
- **Naming**: Hooks follow `use[Feature]` convention (useGameState, useConnection, etc.)
- **Return values**: Hooks return objects with named properties, not arrays
  - Example: `{ state, requestState }` not `[state, requestState]`
- **Auto-cleanup**: All subscriptions clean up automatically when components unmount
- **Context usage**: All hooks must be used inside `<EmberProvider>`

### Testing Approach
- **Unit tests** for all hooks and components
- **MockEmberClient** for simulating server behavior
- **renderWithProvider** helper for testing components with Ember context
- Test coverage goal: 90%+ (currently 90.81%)
- All hooks at 100% coverage, EmberClient at 97.4%

---

## Usage Flow

**Basic setup:**
```tsx
// 1. Wrap app with provider — use config.url, not serverUrl
<EmberProvider config={{ url: 'http://localhost:3000' }}>
  <App />
</EmberProvider>

// 2. Use hooks in components
const { state } = useGameState();
const { createRoom, joinRoom, sendAction } = useRoom();
const { status } = useConnection();
const { player, isHost } = usePlayer();  // key is 'player', not 'currentPlayer'
const phase = usePhase();                // returns value directly, not { phase }

// sendAction takes two args:
sendAction('submit_answer', { text: 'my answer' });
```

**State synchronization:**
```
Server state change
       ↓
Socket.io 'state:update' event
       ↓
EmberClient.onStateChange() callbacks
       ↓
useSyncExternalStore triggers re-render
       ↓
Component receives new state
```

**Action flow:**
```
Component calls useRoom().sendAction()
       ↓
EmberClient.sendAction() Promise
       ↓
Socket.io 'game:action' event
       ↓
Server processes action
       ↓
Server broadcasts new state
       ↓
Component receives state update via useGameState()
```

---

## Related Documentation

- **Architecture:** `docs/architecture/client-library.md` - Detailed design and implementation notes
- **Server Package:** `packages/server/README.md` - Server API reference
- **Core Package:** `packages/core/README.md` - Game engine API
- **Milestones:** `docs/MILESTONES.md` - Development roadmap

---

## Common Patterns

### Conditional rendering by phase
```tsx
const phase = usePhase();
if (phase === 'lobby') return <Lobby />;
if (phase === 'playing') return <Game />;
if (phase === 'results') return <Results />;
```

### Handling connection states
```tsx
const { status, connect } = useConnection();
if (status === 'connecting') return <Spinner />;
if (status === 'error') return <ErrorRetry onRetry={connect} />;
```

### Host-only actions
```tsx
const { isHost } = usePlayer();
const { startGame } = useRoom();
{isHost && <button onClick={startGame}>Start Game</button>}
```

### Custom event listeners
```tsx
useEmberEvent('player_scored', (data) => {
  showNotification(`${data.playerName} scored!`);
});
```
