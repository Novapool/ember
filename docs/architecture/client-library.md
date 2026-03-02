# Client Library Architecture

## Overview

The `@bonfire/client` package provides React hooks and utilities for building game UIs that connect to a Bonfire server. It wraps `socket.io-client` in a type-safe, React-friendly API.

## Architecture

```
BonfireClient (plain TS class, wraps socket.io-client)
       ↓ subscription API (onStateChange, onStatusChange, etc.)
BonfireProvider (React context, subscribes to client)
       ↓ context value (client, status, gameState)
Hooks (useGameState, useRoom, usePlayer, usePhase, useConnection, useBonfireEvent)
```

## Key Classes

### BonfireClient (`src/client/BonfireClient.ts`)

Plain TypeScript class (no React dependency) that manages the socket connection. Can be used without React.

**Promise-based methods** (wrap Socket.io callback acknowledgments):
- `createRoom(gameType, hostName)` → `RoomCreateResponse` — saves session to localStorage
- `joinRoom(roomId, playerName)` → `RoomJoinResponse` — saves session to localStorage
- `leaveRoom()` → `BaseResponse` — clears saved session
- `reconnectToRoom(roomId, playerId)` → `RoomReconnectResponse` — emits `room:reconnect`, restores state
- `startGame()` → `BaseResponse`
- `sendAction(actionType: string, payload: unknown)` → `ActionResponse` — **two args, not one object**
- `requestState()` → `StateResponse`
- `loadSession()` → `{ roomId, playerId } | null` — reads from localStorage for page-refresh reconnect

**Subscription API** (each returns an unsubscribe function):
- `onStateChange(listener)` — fired on `state:update` and `state:sync` from server
- `onStatusChange(listener)` — connection status changes (`'disconnected' | 'connecting' | 'connected' | 'reconnecting'`)
- `onError(listener)` — server error events
- `onGameEvent(eventType, listener)` — typed game event dispatching
- `onRoomClosed(listener)` — room closed notification
- `getSocket()` — exposes raw Socket.io socket for advanced use cases

**Internal state**: Tracks `gameState`, `playerId`, `roomId`, `status` so hooks can synchronously read current values.

### BonfireProvider (`src/context/BonfireProvider.tsx`)

React context provider that wraps the app tree.

- Accepts `client` (pre-created) **or** `config` (creates client internally)
- **Important:** use the `config` prop, not `serverUrl` — `<BonfireProvider config={{ url: '...' }}>`
- `autoConnect` prop (default: true)
- Subscribes to client state/status and triggers React re-renders
- Exposes `useBonfireContext()` internal hook for all public hooks

## Hooks

| Hook | Return Type / Key Values | Pattern |
|------|--------------------------|---------|
| `useGameState()` | `{ state, requestState }` | `useSyncExternalStore` |
| `useConnection()` | `{ status, connect, disconnect }` | `useSyncExternalStore` |
| `useRoom()` | `{ roomId, isInRoom, createRoom, joinRoom, leaveRoom, startGame, sendAction(type, payload), reconnectToRoom(roomId, playerId) }` | `useCallback` wrappers |
| `usePlayer()` | `{ player, playerId, isHost, players }` — key is `player`, not `currentPlayer` | `useMemo` derived from state |
| `usePhase()` | `Phase \| null` — returns value directly, **not** `{ phase }` | `useMemo` derived from state |
| `useBonfireEvent(type, handler)` | `void` | `useEffect` with auto-cleanup |
| `useTurn()` | `{ isMyTurn, currentPlayerId, currentPlayer, turnIndex }` — requires `currentTurnIndex` in game state | `useMemo` derived from state |
| `useCountdown(timerEndsAt)` | `number` — seconds remaining (≥ 0), synchronized to absolute timestamp so all clients agree | `useState` + `useEffect` interval |
| `useSession()` | `{ isRestoring, restored, failed }` — auto-restores saved session on mount; `isRestoring` starts true when a session exists (prevents landing-screen flash) | `useState` + `useEffect` on connection status |

### Why `useSyncExternalStore`

`useGameState` and `useConnection` use React 18's `useSyncExternalStore` to subscribe to the BonfireClient's internal state. This:
- Prevents tearing in concurrent mode
- Is the official React pattern for external store subscriptions
- Is simpler than `useState` + `useEffect` for this use case

## Type Strategy

The client package **does not depend on `@bonfire/server`**. Server response types (`BaseResponse`, `RoomCreateResponse`, `RoomReconnectResponse`, etc.) are imported from `@bonfire/core/contracts.ts` — a single source of truth shared with the server. Socket.io event contracts (`ClientToServerEvents`, `ServerToClientEvents`) are defined locally in `src/types.ts`. This keeps the client free of Node.js-only dependencies (Express, firebase-admin) while eliminating type duplication.

## Testing

- **MockBonfireClient** (`__tests__/fixtures/mockBonfireClient.ts`) — Test double with `simulate*` methods
- **renderWithProvider** (`__tests__/fixtures/renderWithProvider.tsx`) — Helper wrapping `renderHook` with BonfireProvider
- 242 tests total, all passing (hooks at 100% coverage, BonfireClient at 97.4%)

---

## UI Components (Milestone 5)

Pre-built React components for common party game UI patterns. Components use inline styles with shared constants — no Tailwind or external CSS required. Consumers get correct styling with zero setup.

### Design System

Components use shared color, radius, and shadow constants defined in `src/utils/theme.ts`. No CSS classes are applied to structural or color concerns. Storybook no longer requires a separate CSS build step.

**Color mapping used in components (via `theme.ts` constants):**
- Brand: indigo (`#6366f1` / `#4f46e5`)
- Surfaces: white / light gray (`#f3f4f6`)
- Text primary: `#111827`
- Text secondary: `#6b7280`
- Warning: amber (`#f59e0b`), Error: red (`#ef4444`)

### PlayerAvatar (`src/components/PlayerAvatar.tsx`)

Renders a player's avatar as a colored circle with initials. Color is deterministically derived from the player's name via the `colorHash` utility.

```
Props:
  name: string                         — Player name (used for initials and color)
  color?: string                       — Override auto-generated color
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'  — Size variant (default: 'md')
  showStatus?: boolean                 — Show online/offline indicator dot
  isOnline?: boolean                   — Online status (requires showStatus: true)
  isHost?: boolean                     — Show crown icon for host
  className?: string
```

### Timer (`src/components/Timer.tsx`)

Countdown timer with an optional circular SVG progress ring. Automatically transitions variant colors as time runs low.

```
Props:
  duration: number                     — Total countdown duration in seconds
  onComplete?: () => void              — Fired when countdown reaches zero
  showProgress?: boolean               — Show SVG progress ring (default: true)
  variant?: 'default' | 'warning' | 'danger'  — Color variant (default: 'default')
  size?: 'sm' | 'md' | 'lg'           — Size variant (default: 'md')
  autoStart?: boolean                  — Start on mount (default: true)
  className?: string
```

### Lobby (`src/components/Lobby.tsx`)

Pre-built lobby screen integrating `useGameState`, `usePlayer`, and `useRoom` hooks internally. Displays the room code with one-click clipboard copy, a scrollable player list using `PlayerAvatar`, and a host-only start button.

```
Props:
  roomCode?: string                    — Override auto-detected room code
  renderPlayer?: (player, isHost) => ReactNode  — Custom player row renderer
  showReadyStates?: boolean            — Show per-player ready indicators (default: false)
  onStart?: () => void | Promise<void> — Override start button handler
  hideStartButton?: boolean            — Hide start button entirely (default: false)
  className?: string
```

Reads min/max player counts from `state.metadata.config`.

### PromptCard (`src/components/PromptCard.tsx`)

Themed card for displaying questions, prompts, or dares. The `variant` controls the card's border color and badge appearance.

```
Props:
  prompt: string                       — The question or prompt text (required)
  variant?: 'standard' | 'spicy' | 'creative' | 'dare'  — Visual theme (default: 'standard')
  category?: string                    — Override the variant badge label
  round?: number                       — Current round number
  totalRounds?: number                 — Total rounds (shows "Round X of Y")
  subtitle?: string                    — Secondary instruction text below prompt
  children?: ReactNode                 — Slot rendered below the prompt (e.g., ResponseInput)
  animate?: boolean                    — Slide-up entrance animation (default: false)
  className?: string
```

Variant color scheme:
- `standard` — indigo/brand-primary border and badge
- `spicy` — red border and badge
- `creative` — purple border and badge
- `dare` — orange border and badge

### ResponseInput (`src/components/ResponseInput.tsx`)

Polymorphic input component. The input mode is determined entirely by the `config.type` discriminated union — no separate components to import.

```
Props:
  config: InputConfig                  — Determines mode (see below)
  value?: string | string[]            — Controlled value
  onChange?: (value) => void           — Called on every change
  onSubmit?: (value) => void           — Called when user submits
  disabled?: boolean                   — Disable all inputs (default: false)
  showSubmit?: boolean                 — Show submit button (default: true)
  submitLabel?: string                 — Submit button label (default: 'Submit')
  className?: string
```

**Config types:**

```typescript
// Text input (single-line or multiline)
{ type: 'text'; placeholder?: string; maxLength?: number; multiline?: boolean }

// Multiple choice (single-select or multi-select)
{ type: 'multiple-choice'; choices: Choice[]; allowMultiple?: boolean }

// Ranking (add items from pool, reorder, remove)
{ type: 'ranking'; items: Choice[] }

interface Choice { id: string; label: string; description?: string }
```

Text mode: Enter key submits (single-line only). Multiline shows character counter when `maxLength` is set.

Multiple choice: `allowMultiple: false` (default) = radio behavior (single selection replaces previous). `allowMultiple: true` = checkbox behavior (toggle selections).

Ranking: Items start in an unranked pool. Tap to add to the ranked list. Use up/down arrows to reorder. Remove button returns item to pool.

### RevealPhase (`src/components/RevealPhase.tsx`)

Sequentially reveals a list of items using configurable animation delays. Each item animates in one at a time. Fires `onRevealComplete` when all items have been shown.

```
Props:
  items: RevealItem[]                  — Array of { id, content } items to reveal
  renderItem?: (item, index) => ReactNode  — Custom render function per item
  delayBetween?: number                — Ms between each reveal (default: 600)
  animateIn?: boolean                  — Enable slide-in animation (default: true)
  onRevealComplete?: () => void        — Fired after last item reveals
  className?: string
```

### GameProgress (`src/components/GameProgress.tsx`)

Displays current progress through rounds or phases in one of three visual modes.

```
Props:
  current: number                      — Current step (1-indexed)
  total: number                        — Total number of steps
  variant?: 'bar' | 'dots' | 'number' — Visual mode (default: 'bar')
  label?: string                       — Label prefix (e.g. "Round" → "Round 2 of 5")
  className?: string
```

All variants render with `role="progressbar"` and `aria-valuenow`/`aria-valuemax` for accessibility.

### VotingInterface (`src/components/VotingInterface.tsx`)

Full voting UI component. Supports active voting mode and a results display mode with vote counts, percentage bars, and winner highlighting.

```
Props:
  options: VoteOption[]                     — Array of { id, label, description?, author? } options
  onVote?: (optionId: string) => void       — Called when a player selects an option
  currentVote?: string                      — Currently selected option ID (controlled)
  disabled?: boolean                        — Disable all vote buttons (default: false)
  showResults?: boolean                     — Show vote counts and percentages (default: false)
  voteCounts?: Record<string, number>       — Map of option ID → vote count
  totalVoters?: number                      — Total voters (used for percentage calculation)
  title?: string                            — Heading shown above options
  className?: string
  style?: React.CSSProperties
```

### colorHash Utility (`src/utils/colorHash.ts`)

```typescript
getPlayerColor(name: string): string   — Returns a CSS hex color deterministically from name
getPlayerInitials(name: string): string — Returns 1-2 uppercase initials from name
```

Used by `PlayerAvatar` internally and available for custom avatar implementations.

### Storybook

All components have Storybook 8 stories under `src/components/*.stories.tsx`. Run with:

```bash
cd packages/client && npm run storybook
```

Stories include a combined `PromptCard` + `ResponseInput` demo showing the intended composition pattern.

---

## Directory Structure

```
packages/client/
├── src/
│   ├── index.ts                    # Barrel exports
│   ├── types.ts                    # Client types + mirrored server types
│   ├── client/
│   │   └── BonfireClient.ts        # Socket.io wrapper class
│   ├── context/
│   │   └── BonfireProvider.tsx     # React context provider
│   ├── hooks/
│   │   ├── useGameState.ts
│   │   ├── useConnection.ts
│   │   ├── useRoom.ts
│   │   ├── usePlayer.ts
│   │   ├── usePhase.ts
│   │   ├── useBonfireEvent.ts
│   │   ├── useTurn.ts              # Turn-based game helper
│   │   ├── useCountdown.ts         # Synchronized countdown timer (pairs with state.timerEndsAt)
│   │   └── useSession.ts           # Page-refresh reconnect automation
│   ├── components/
│   │   ├── BonfireErrorBoundary.tsx
│   │   ├── Lobby.tsx               # Pre-built lobby screen
│   │   ├── Lobby.stories.tsx
│   │   ├── PlayerAvatar.tsx        # Player avatar with colorHash
│   │   ├── PlayerAvatar.stories.tsx
│   │   ├── Timer.tsx               # Countdown timer with progress ring
│   │   ├── Timer.stories.tsx
│   │   ├── PromptCard.tsx          # Themed prompt/question card
│   │   ├── PromptCard.stories.tsx
│   │   ├── ResponseInput.tsx       # Polymorphic response input
│   │   ├── ResponseInput.stories.tsx
│   │   ├── RevealPhase.tsx         # Sequential animated item reveal
│   │   ├── RevealPhase.stories.tsx
│   │   ├── GameProgress.tsx        # Round/phase progress indicator
│   │   ├── GameProgress.stories.tsx
│   │   ├── VotingInterface.tsx     # Voting UI with results display
│   │   └── VotingInterface.stories.tsx
│   └── utils/
│       ├── colorHash.ts            # Deterministic player color utility
│       └── theme.ts                # Shared inline style constants (colors, radius, shadows)
└── __tests__/
    ├── client/
    │   └── BonfireClient.test.ts
    ├── hooks/
    │   ├── useGameState.test.ts
    │   ├── useConnection.test.ts
    │   ├── useRoom.test.ts
    │   ├── usePlayer.test.ts
    │   ├── usePhase.test.ts
    │   └── useBonfireEvent.test.ts
    ├── components/
    │   ├── BonfireErrorBoundary.test.tsx
    │   ├── Lobby.test.tsx
    │   ├── PlayerAvatar.test.tsx
    │   ├── Timer.test.tsx
    │   ├── PromptCard.test.tsx
    │   ├── ResponseInput.test.tsx
    │   ├── RevealPhase.test.tsx
    │   ├── GameProgress.test.tsx
    │   └── VotingInterface.test.tsx
    └── fixtures/
        ├── mockBonfireClient.ts
        └── renderWithProvider.tsx
```
