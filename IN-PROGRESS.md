# IN-PROGRESS - Bonfire Platform / Ember Framework

**Last Updated:** March 25, 2026 (Disconnect/rejoin handling fixes: reconnectToRoom timeout, leaveRoom timeout, iOS visibilitychange recovery)

---

## Current Work

### Milestone 8 - Second Game: Validation (PENDING)
- Status: 🔴 Not Started
- Goal: Build a different game type to prove Ember framework flexibility
- Milestone 7 is a prerequisite: framework now ready for Game 2 with zero workarounds

---

## Active Plan

No active plan — Milestone 7 just completed. Start Milestone 8 by choosing a game concept.

**Options for Game 2:**
- Two Truths and a Lie — simple, different mechanic from Surface Level
- Values Alignment — voting-heavy, good stress test for VotingInterface
- Hot Takes — opinion-based, good use of ResponseInput + RevealPhase

---

## Recently Completed

1. **Disconnect/rejoin handling fixes** (Mar 25, 2026)
   - ✅ `reconnectToRoom` wrapped with `withTimeout` — no longer hangs forever if server never acks; `useSession.isRestoring` now always resolves within 10s
   - ✅ `leaveRoom` wrapped with `withTimeout` — consistent with other room operations; local state clears even if server is unreachable
   - ✅ iOS background recovery: `EmberClient` now attaches a `visibilitychange` listener (browser-only, cleaned up on `disconnect()`) that fires `onVisibilityReconnect` when tab becomes visible and socket is connected
   - ✅ `useSession` subscribes to `onVisibilityReconnect` and re-attempts `reconnectToRoom` when the app returns from background and the room session may have been lost server-side
   - ✅ Pre-existing test blocker fixed: renamed `postcss.config.js` → `postcss.config.cjs` (CJS syntax incompatible with package `"type": "module"`)
   - ✅ 266 client tests, all passing

2. **Framework class rename: Bonfire* → Ember*** (Mar 4, 2026)
   - ✅ Renamed `BonfireClient` → `EmberClient` (class + file)
   - ✅ Renamed `BonfireProvider` → `EmberProvider` (component + file)
   - ✅ Renamed `useBonfireEvent` → `useEmberEvent` (hook + file)
   - ✅ Renamed `BonfireErrorBoundary` → `EmberErrorBoundary` (component + file)
   - ✅ Renamed `MockBonfireClient` → `MockEmberClient` (test fixture + file)
   - ✅ Renamed `useBonfireContext` → `useEmberContext` (internal hook)
   - ✅ Renamed `BonfireClientConfig` → `EmberClientConfig`, `BonfireGameEvent` → `EmberGameEvent`
   - ✅ Updated all imports, exports, tests, storybook, README, CLAUDE.md
   - ✅ TypeScript compiles cleanly with zero errors
   - Package scope stays `@bonfire/*` (avoids npm conflict with Ember.js)

2. **Milestone 7 - Dual-Use Architecture** (Feb 28, 2026)
   - ✅ `useLobby()` headless hook — all Lobby logic, 15 tests
   - ✅ `useResponseInput()` headless hook — all ResponseInput logic, rankingOps, 23 tests
   - ✅ `<Lobby>` and `<ResponseInput>` refactored as thin wrappers
   - ✅ `styles` prop map added to 5 components (PromptCard, Lobby, PlayerAvatar, Timer, VotingInterface)
   - ✅ `transitionPhase()` error now lists valid phases
   - ✅ Dev-mode warning when `onGameStart()` returns without `transitionPhase()`
   - ✅ `createRoom()` / `joinRoom()` timeout — returns `{ success: false }` after 10s
   - ✅ `docs/DUAL_USE_GUIDE.md` — all three patterns documented with full examples
   - ✅ 242 client tests, 131 core tests — all passing

2. **Convert UI components to inline styles** (Feb 28, 2026)
   - ✅ New `src/utils/theme.ts` — shared color, radius, and shadow constants used by all 8 UI components
   - ✅ All 8 components (PlayerAvatar, PromptCard, Timer, ResponseInput, Lobby, GameProgress, RevealPhase, VotingInterface) migrated from Tailwind utility classes to inline styles
   - ✅ Zero external CSS dependencies — consumers no longer need Tailwind installed or configured
   - ✅ Tests updated to assert on inline styles and `data-testid` instead of Tailwind class names
   - ✅ `packages/client/CLAUDE.md` updated to reflect inline styles
   - ✅ `docs/KNOWN_ISSUES.md` updated to mark the Tailwind token bug as fixed

2. **Disconnect Strategies + Reconnect System + DX Hooks** (Feb 27, 2026)
   - ✅ `DisconnectStrategy` type added to `GameConfig` (`reconnect-window` | `close-on-host-leave` | `transfer-host` | `skip-turn`)
   - ✅ `currentTurnIndex?: number` added to `GameState` (needed for `skip-turn` + `useTurn`)
   - ✅ `transferHost()` + `handleSkipTurn()` added to `SocialGame`, wired into `disconnectPlayer()`
   - ✅ `SocketServer.handleDisconnect` — closes room immediately if host leaves and strategy is `close-on-host-leave`
   - ✅ `room:reconnect` event — server-side `handleRoomReconnect`, `RoomReconnectResponse` contract type
   - ✅ `BonfireClient.reconnectToRoom()` + `loadSession()` — sessionStorage auto-save/clear on join/leave/close
   - ✅ `useRoom()` exposes `reconnectToRoom(roomId, playerId)`
   - ✅ `useTurn()` hook — `isMyTurn`, `currentPlayerId`, `currentPlayer`, `turnIndex`
   - ✅ `useGameState<TState>()` — typed generic eliminates cast at every call site
   - All tests still passing (core 131, server, client)

2. **Framework Blocker Fixes** (Feb 19, 2026)
   - ✅ `broadcastEvent(type, payload)` added to `SocialGame` — game subclasses can now push custom events (e.g. `question_revealed`, `round_ended`) to clients without unsafe casting. Added `broadcastCustomEvent` to `IStateSynchronizer` + `SocketStateSynchronizer`.
   - ✅ `playerOrder?: PlayerId[]` added to base `GameState` — turn-based games no longer need to manage this manually in metadata.
   - ✅ `style?: React.CSSProperties` added to all 8 UI components — inline styles now work alongside `className`.
   - ✅ 4 pre-existing broken client tests fixed (stale Tailwind class names from token migration).
   - All tests passing: core 131/131, client 204/204, server non-Firebase 129/129.
   - New docs: `docs/KNOWN_ISSUES.md` — canonical tracker for active bugs and recently fixed issues.

2. **Bonfire Bug Fixes from Surface Level** (Feb 19, 2026)
   - ✅ `SocketServer.handleGameAction` — was a stub, now properly delegates to `room.game.handleAction(action)` (already fixed)
   - ✅ **UI components Tailwind tokens** — replaced all Bonfire-specific tokens (`bg-surface`, `text-brand-primary`, `text-text-secondary`, etc.) with standard Tailwind equivalents (`bg-white`, `text-indigo-500`, `text-gray-500`, etc.) in all 8 components + stories
   - ✅ **API documentation** — fixed incorrect signatures in README.md, architecture doc, CLAUDE.md:
     - `usePlayer()`: key is `player` not `currentPlayer`
     - `sendAction(type, payload)`: two args, not one object
     - `usePhase()`: returns value directly, not `{ phase }`
     - `BonfireProvider`: uses `config` prop, not `serverUrl`
   - ✅ **Vite CJS interop** — added `optimizeDeps` + `commonjsOptions` config to README
   - ✅ **Build order** — documented that Bonfire packages must be built before game project install

3. **Milestone 6 - Surface Level Project Scaffolded** (Feb 17, 2026)
   - Created `~/Documents/Programs/games/surface_level/` as standalone project
   - Ported question bank (5 levels, ~200 questions) from LOI v1 to TypeScript
   - Wrote complete game design doc: state model, player actions, turn flow
   - Wrote architecture doc: how game uses Bonfire layers
   - Wrote curated Bonfire docs (server-setup + client-api) for Surface Level sessions
   - Set up package.json with `file:` references to Bonfire packages
   - Created placeholder entry points ready for implementation

4. **Milestone 5 - UI Components Phase 4** (Feb 12, 2026)
   - Built `<RevealPhase>` - Sequential animated reveal for answers/players, supports custom renderItem, configurable delay, onRevealComplete callback
   - Built `<GameProgress>` - Progress indicator with bar/dots/number variants, all with ARIA progressbar role
   - Built `<VotingInterface>` - Full voting UI with results display, vote counts, percentages, winner highlighting
   - Added Storybook stories for all 3 Phase 4 components
   - Exported all new components from @bonfire-ember/client index.ts
   - **205 total tests, all passing** (46 new for Phase 4)
   - Updated all documentation (CLAUDE.md, MILESTONES.md, IN-PROGRESS.md, client CLAUDE.md, client README.md)

5. **Milestone 5 - UI Components Phase 3** (Feb 12, 2026)
   - Built PromptCard with 4 variants (standard/spicy/creative/dare), category badge, round indicator
   - Built ResponseInput: text (single/multiline), multiple-choice (single/multi-select), ranking modes
   - Exported all 5 components + colorHash utility from @bonfire-ember/client index
   - Added Storybook stories for both components (including combined PromptCard+ResponseInput demo)
   - 159 tests total (100 new for Phase 3), all passing

3. **Milestone 5 - UI Components Phase 1-2** (Feb 11, 2026)
   - Set up Tailwind CSS v4 with @theme directive for design tokens
   - Configured Storybook 8 with BonfireProvider decorator
   - Built 3 core components: Lobby, Timer, PlayerAvatar
   - Created colorHash utility for deterministic player colors
   - Wrote 59 tests (48 component + 11 utility), all passing

---

## Blockers

_No active blockers. See `docs/KNOWN_ISSUES.md` for the canonical issue tracker._

---

## Next Steps

1. **Short-term (Next Sprint — Milestone 8):**
   - Choose Game 2 concept (see options in Active Plan)
   - Scaffold standalone project like Surface Level
   - Build using framework with zero modifications — prove it works

2. **Medium-term (Milestone 9+):**
   - CLI tool (`create-ember-game`) for scaffolding new games
   - Documentation site (Docusaurus/VitePress)

---

## Notes & Context

**Current Architecture:**
- Monorepo structure with TypeScript
- Three main Ember framework packages: @bonfire-ember/core, /server, /client (package scope stays @bonfire/*)
- Using npm workspaces for dependency management

**UI Component Library Summary (Milestone 5 Complete):**
- 8 components: Lobby, PlayerAvatar, Timer, PromptCard, ResponseInput, RevealPhase, GameProgress, VotingInterface
- 1 utility: colorHash
- 205 tests, all passing
- Storybook 8 with full story coverage
- Inline styles via `src/utils/theme.ts` — zero external CSS dependencies

**Key Decisions:**
- Chose npm workspaces over Turborepo for simplicity (can migrate later)
- useSyncExternalStore for hook state subscriptions (React 18 best practice)
- Server-authoritative model — no client-side optimistic update machinery
- Shared contract types in @bonfire-ember/core/contracts.ts (client/server import from single source)

**Documentation Status:**
- Root CLAUDE.md ✅ (updated Mar 5, 2026 - audit: added DUAL_USE_GUIDE, KNOWN_ISSUES to index, fixed project structure block)
- docs/PROJECT_OVERVIEW.md ✅ (updated Mar 5, 2026 - fixed "Intimacy Ladder" → "Surface Level")
- docs/MILESTONES.md ✅ (updated Mar 5, 2026 - fixed "IntimacyLadderGame" → "SurfaceLevelGame")
- docs/DUAL_USE_GUIDE.md ✅ (updated Feb 28, 2026)
- docs/PLATFORM_VISION.md ✅
- docs/architecture/core-classes.md ✅ (updated Mar 5, 2026 - removed stale M3 future-work note)
- docs/architecture/server-infrastructure.md ✅
- docs/architecture/client-library.md ✅ (updated Mar 5, 2026 - added missing hook test files to directory listing)
- docs/api/FIREBASE.md ✅
- docs/api/ADMIN_API.md ✅
- docs/KNOWN_ISSUES.md ✅ (updated Mar 25, 2026 - resolved stale provider naming active issue; added Tailwind dependency cleanup issue)
- IN-PROGRESS.md ✅ (updated Mar 25, 2026)
- packages/core/README.md ✅
- packages/server/README.md ✅
- packages/server/CLAUDE.md ✅ (updated Feb 19, 2026)
- packages/client/README.md ✅ (updated Feb 28, 2026)
- README.md ✅ (updated Mar 25, 2026 - fixed Vite section: ESM, no CJS interop needed; fixed file: path example)
- packages/client/CLAUDE.md ✅ (updated Mar 5, 2026 - added theme.ts to utils listing)
