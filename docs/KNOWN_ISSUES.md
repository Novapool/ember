# Known Issues & Blockers

Active bugs and framework gaps discovered during development.

**Workflow:** Add issues here when found. Remove (or move to "Recently Fixed") once confirmed fixed.

---

## Active Issues

### Component business logic has no standalone headless hooks

**Severity:** Medium — affects game devs who want custom UI but don't want to re-derive framework-managed logic

**Discovered:** February 28, 2026 — during LOIV2 dual-use architecture review

**Affected components:**

| Component | Logic trapped inside | Missing hook |
|---|---|---|
| `<Lobby>` | `canStart = isHost && players.length >= minPlayers`, reads `minPlayers`/`maxPlayers` from `state.metadata.config`, room code clipboard handling, `isStarting` state | `useLobby()` |
| `<ResponseInput>` | Text validation, ranking `moveUp`/`moveDown`/`add`/`remove`, multi-select toggle, character counter | `useResponseInput(config)` |

**Impact:** A game dev who wants a fully custom-styled lobby (different font, colors, layout) can use `useGameState()` / `usePlayer()` / `useRoom()` for game state, but still has to manually re-derive `canStart`, `minPlayers`, and `roomCode` — logic the framework already knows. The same applies to any input form that wants custom UI around `<ResponseInput>`'s ranking/validation logic.

**Current workaround:** Re-implement the logic in the consuming game (as LOIV2 does).

**Fix needed:** Extract standalone hooks:
```typescript
// useLobby — expose all lobby logic without the UI
const { roomCode, canStart, minPlayers, maxPlayers, isStarting, handleCopyCode, handleStart, copied } = useLobby();

// useResponseInput — expose all input logic without the UI
const { value, handleChange, canSubmit, reset, rankingOps } = useResponseInput(config);
```
Then `<Lobby>` and `<ResponseInput>` become thin wrappers over these hooks. Tracked in **Milestone 7, Phase 1**.

---

## Framework Gaps Resolved (Feb 27, 2026)

The following gaps were discovered during LOIV2 development and are now fixed in the framework itself.

---

## Recently Fixed

### ~~No disconnect strategy configuration~~ ✅ Fixed Feb 27, 2026
**Symptom:** Server always applied reconnect-window behavior on disconnect. No way to configure close-on-host-leave, host transfer, or turn skipping.
**Fix:** Added `disconnectStrategy` to `GameConfig` (`'reconnect-window'` | `'close-on-host-leave'` | `'transfer-host'` | `'skip-turn'`). `SocialGame.disconnectPlayer()` applies the strategy. `SocketServer.handleDisconnect` handles `close-on-host-leave`.

---

### ~~No reconnect path after page refresh~~ ✅ Fixed Feb 27, 2026
**Symptom:** Players who refreshed the page had no way back into their session — they had to re-enter the room code and name, getting a new player ID.
**Fix:** `BonfireClient` auto-saves `{ roomId, playerId }` to `sessionStorage` on `createRoom`/`joinRoom`, clears on `leaveRoom`/`room:closed`. New `reconnectToRoom(roomId, playerId)` method (and `useRoom().reconnectToRoom`) emits `room:reconnect` to the server, which validates the player still exists and restores the session. `loadSession()` reads the saved session.
**Usage:**
```typescript
// On app mount:
const session = client.loadSession();
if (session) await reconnectToRoom(session.roomId, session.playerId);
```

---

### ~~Verbose turn-order boilerplate~~ ✅ Fixed Feb 27, 2026
**Symptom:** Turn-based games had to manually index `state.playerOrder[state.currentTurnIndex]` in every component.
**Fix:** Added `currentTurnIndex?: number` to `GameState`. New `useTurn()` hook exposes `{ isMyTurn, currentPlayerId, currentPlayer, turnIndex }`.
**Usage:**
```typescript
const { isMyTurn, currentPlayer } = useTurn();
if (isMyTurn) return <YourTurnBanner />;
```

---

### ~~`useGameState()` always returns `GameState`, requires cast~~ ✅ Fixed Feb 27, 2026
**Symptom:** Games with extended state had to cast at every call site: `const myState = state as MyGameState`.
**Fix:** `useGameState<TState>()` now accepts a generic that defaults to `GameState`.
**Usage:**
```typescript
const { state } = useGameState<MyGameState>();
// state is typed as MyGameState | null — no cast needed
```

---

### ~~`broadcastEvent` missing on SocialGame~~ ✅ Fixed Feb 19, 2026
**Symptom:** No clean way for game subclasses to push one-time custom events (e.g. `question_revealed`, `round_ended`) to clients. The underlying `synchronizer.broadcastEvent` was typed to framework-internal `GameEventType` only.
**Fix:** Added `broadcastCustomEvent(type, payload)` to `IStateSynchronizer` interface, implemented in `SocketStateSynchronizer`, and exposed as `protected broadcastEvent(type, payload)` on `SocialGame` for game subclasses to call.
**Usage:**
```typescript
// In your game class:
await this.broadcastEvent('question_revealed', { question, level });
```

---

### ~~`playerOrder` missing from base GameState~~ ✅ Fixed Feb 19, 2026
**Symptom:** Every turn-based game needs a player turn order, but `GameState` had no field for it, forcing games to manage this in custom metadata or a separate field.
**Fix:** Added `playerOrder?: PlayerId[]` as an optional field on `GameState` in `packages/core/src/types.ts`.
**Usage:**
```typescript
// Initialize in your game state:
playerOrder: players.map(p => p.id),
// Or shuffle:
playerOrder: shuffleArray(players.map(p => p.id)),
```

---

### ~~UI components missing `style` prop~~ ✅ Fixed Feb 19, 2026
**Symptom:** All 8 UI components accepted `className` but not `style`, making it impossible to apply inline styles (e.g. custom brand colors, dynamic values) without wrapping in a container div.
**Fix:** Added `style?: React.CSSProperties` to all 8 component prop interfaces (`Lobby`, `Timer`, `PlayerAvatar`, `PromptCard`, `ResponseInput`, `GameProgress`, `RevealPhase`, `VotingInterface`). `PlayerAvatar` merges the prop with its internal `backgroundColor` style.

---

### ~~UI components require Tailwind setup to render correctly~~ ✅ Fixed Feb 28, 2026
**Symptom:** Components were visually broken out of the box — Lobby rendered as a disaster, PlayerAvatar became a full-width blob, buttons were browser defaults. Required consumer to install Tailwind AND configure the Bonfire preset with custom design tokens. A previous partial fix replaced custom tokens with standard Tailwind, but still required consumer Tailwind setup.
**Fix:** Converted all 8 components to inline styles. Created a shared `src/utils/theme.ts` with color constants. Components now render correctly with zero consumer setup — no Tailwind, no CSS, no configuration required. Hover and focus states handled via React `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur`. Tests updated from class-name assertions to style/attribute assertions.

---

### ~~`SocketServer.handleGameAction` was a stub~~ ✅ Fixed Feb 19, 2026
**Symptom:** Game actions sent from clients were silently dropped — `handleGameAction` existed but did not delegate to `room.game.handleAction()`.
**Fix:** Wired up the delegation in `SocketServer`.

---

### ~~API documentation had wrong signatures~~ ✅ Fixed Feb 19, 2026
**Symptom:** Docs showed incorrect hook return keys and function signatures, causing silent failures.
**Fix:** Corrected in README.md, architecture doc, and CLAUDE.md:
- `usePlayer()` → key is `player`, not `currentPlayer`
- `sendAction(type, payload)` → two separate args, not one object
- `usePhase()` → returns value directly, not `{ phase }`
- `BonfireProvider` → use `config` prop, not `serverUrl`
