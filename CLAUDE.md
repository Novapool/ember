# Bonfire

**Bonfire** is the party game platform. **Ember** is the open-source TypeScript framework underneath it — "Rails for party games".

## Current Status
Milestone 1: Foundation & Architecture ✅ Complete (Feb 8, 2026)
Milestone 2: Core Game Engine ✅ Complete (Feb 8, 2026)
Milestone 3: Server Infrastructure ✅ Complete (Feb 8, 2026)
Milestone 4: Client Library ✅ Complete (Feb 9, 2026)
Milestone 5: UI Component Library ✅ Complete (Feb 12, 2026)
Milestone 6: First Game - Surface Level ✅ Complete (Feb 28, 2026)
Milestone 7: Dual-Use Architecture ✅ Complete (Feb 28, 2026)
Milestone 7.5: Session & Timer Improvements ✅ Complete (Mar 1, 2026)
**Next:** Milestone 8: Second Game - Validation 🔵

## Documentation

**When working on this project, read documentation based on what you're doing:**

- `IN-PROGRESS.md` - **START HERE** - Current work, active plans, recent changes
  - Read when: Starting a new session, checking project state, understanding what's next

- `docs/PROJECT_OVERVIEW.md` - Architecture, tech stack, philosophy, features
  - Read when: Understanding project goals, making architectural decisions, choosing tech

- `docs/PLATFORM_VISION.md` - Platform product vision, business model, audience, game library strategy
  - Read when: Working on the platform layer, making product decisions, planning Milestone 8+

- `docs/MILESTONES.md` - Development roadmap with detailed tasks
  - Read when: Planning work, checking overall progress, understanding long-term priorities

- `docs/architecture/` - System design, component structure, data flow
  - Read when: Understanding framework internals, contributing to core, debugging issues
  - `core-classes.md` - Game engine architecture (SocialGame, PlayerManager, validators)
  - `server-infrastructure.md` - Server classes (SocketServer, RoomManager, SocketStateSynchronizer, adapters)
  - `client-library.md` - Client library architecture (EmberClient, EmberProvider, hooks, UI components)

- `docs/api/` - API integration and endpoint documentation
  - Read when: Setting up databases, deploying servers, managing production
  - `FIREBASE.md` - Complete Firebase setup guide (local dev with emulator, production deployment)
  - `ADMIN_API.md` - Admin REST endpoints (stats, force-end, kick player)

- `docs/DUAL_USE_GUIDE.md` - Three usage patterns: drop-in components, headless hooks, hooks-only
  - Read when: Building game UIs, choosing between default components and custom UI

- `docs/KNOWN_ISSUES.md` - Canonical bug tracker; active issues and recently fixed
  - Read when: Debugging framework issues, checking if a problem is known

- `docs/SETUP.md` - Local development setup (clone, build order, tests, emulator, Storybook)
  - Read when: Setting up the project for the first time, running tests, configuring the Firebase emulator

## Project Structure

```
ember/
├── packages/
│   ├── core/          - @bonfire-ember/core package (game engine)
│   ├── server/        - Server infrastructure (Milestone 3+)
│   └── client/        - Client library and components (Milestone 4+)
└── docs/
    ├── architecture/  - Core class design and system architecture
    ├── api/           - API integration and endpoint documentation
    ├── MILESTONES.md  - Development roadmap
    ├── PROJECT_OVERVIEW.md - Vision and philosophy
    ├── PLATFORM_VISION.md  - Platform product vision and business model
    ├── DUAL_USE_GUIDE.md   - Three UI usage patterns with examples
    └── KNOWN_ISSUES.md     - Active bug tracker and recently fixed issues
```

## Tech Stack

- **Language:** TypeScript
- **Monorepo:** npm workspaces (chosen over Turborepo for simplicity — see MILESTONES.md notes)
- **Realtime:** Socket.io
- **Frontend:** React
- **Backend (Current Production):** Firebase Realtime Database
- **Backend (Future Scale):** Railway + PostgreSQL + Redis

## Games Built on Bonfire

- **Surface Level** (`games/surface_level/`) — first game, primary beta tester; Firebase adapter, full reconnect, timers
  - Integration notes and workarounds: `games/surface_level/docs/TO-REMEMBER.md`
  - Issues for Ember to fix: `docs/KNOWN_ISSUES.md` (game projects write here directly)
- **Split** (`games/split/`) — simultaneous voting pattern; InMemoryAdapter
  - Integration notes: `games/split/docs/TO-REMEMBER.md`
- **Rank'd** (`games/rankd/`) — simultaneous ranking; InMemoryAdapter; Bonfire integration complete
- **Decoy** (`games/decoy/`) — deduction game; custom Spark framework (no React); Papers Please aesthetic

## Cross-Project Reference

- `~/.claude/BONFIRE_ECOSYSTEM.md` — issue flow, full doc map, cross-project rules
