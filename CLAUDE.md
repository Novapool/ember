# Bonfire

An open-source TypeScript framework for building social party games - "Rails for party games".

## Current Status
Milestone 1: Foundation & Architecture ✅ Complete (Feb 8, 2026)
Milestone 2: Core Game Engine ✅ Complete (Feb 8, 2026)
Milestone 3: Server Infrastructure ✅ Complete (Feb 8, 2026)
Milestone 4: Client Library ✅ Complete (Feb 9, 2026)
Milestone 5: UI Component Library ✅ Complete (Feb 12, 2026)
Milestone 6: First Game - Intimacy Ladder v2 ✅ Complete (Feb 28, 2026)
Milestone 7: Dual-Use Architecture ✅ Complete (Feb 28, 2026)
**Next:** Milestone 8: Second Game - Validation 🔵

## Documentation

**When working on this project, read documentation based on what you're doing:**

- `IN-PROGRESS.md` - **START HERE** - Current work, active plans, recent changes
  - Read when: Starting a new session, checking project state, understanding what's next

- `docs/PROJECT_OVERVIEW.md` - Architecture, tech stack, philosophy, features
  - Read when: Understanding project goals, making architectural decisions, choosing tech

- `docs/MILESTONES.md` - Development roadmap with detailed tasks
  - Read when: Planning work, checking overall progress, understanding long-term priorities

- `docs/architecture/` - System design, component structure, data flow
  - Read when: Understanding framework internals, contributing to core, debugging issues
  - `core-classes.md` - Game engine architecture (SocialGame, PlayerManager, validators)
  - `server-infrastructure.md` - Server classes (SocketServer, RoomManager, SocketStateSynchronizer, adapters)
  - `client-library.md` - Client library architecture (BonfireClient, Provider, hooks, UI components)

- `docs/api/` - API integration and endpoint documentation
  - Read when: Setting up databases, deploying servers, managing production
  - `FIREBASE.md` - Complete Firebase setup guide (local dev with emulator, production deployment)
  - `ADMIN_API.md` - Admin REST endpoints (stats, force-end, kick player)

**Future documentation (create as needed):**
- `docs/SETUP.md` - Local development setup instructions

## Project Structure

```
bonfire/
├── packages/
│   ├── core/          - @bonfire/core package (game engine)
│   ├── server/        - Server infrastructure (Milestone 3+)
│   └── client/        - Client library and components (Milestone 4+)
└── docs/
    ├── architecture/  - Core class design and system architecture
    ├── api/           - API integration and endpoint documentation
    ├── MILESTONES.md  - Development roadmap
    └── PROJECT_OVERVIEW.md - Vision and philosophy
```

## Tech Stack

- **Language:** TypeScript
- **Monorepo:** npm workspaces or Turborepo (TBD)
- **Realtime:** Socket.io
- **Frontend:** React
- **Backend (MVP):** Firebase Realtime Database
- **Backend (Production):** Railway + PostgreSQL + Redis

## Games Built on Bonfire

- **Intimacy Ladder V2** (`~/Documents/Programs/LOIV2/`) — first game, primary beta tester
  - Integration notes and workarounds: `LOIV2/docs/TO-REMEMBER.md`
  - Issues for Bonfire to fix: `docs/KNOWN_ISSUES.md` (game projects write here directly)

## Cross-Project Reference

- `~/.claude/BONFIRE_ECOSYSTEM.md` — issue flow, full doc map, cross-project rules
