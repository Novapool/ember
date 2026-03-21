# @bonfire-ember/server Package

Server infrastructure for Ember - multi-room orchestration, Socket.io integration, and database abstraction.

**Status:** ✅ Milestone 3 Complete - All 4 Phases Done! (Firebase integration ready)

---

## Package Overview

This package provides the server-side infrastructure for running Ember games:
- **SocketServer** - Production-ready Express + Socket.io server
- **RoomManager** - Multi-room orchestration and lifecycle management
- **SocketStateSynchronizer** - Realtime state broadcasting via Socket.io + database
- **IDatabaseAdapter** - Backend abstraction interface
- **InMemoryAdapter** - In-memory implementation for testing
- Type-safe Socket.io event contracts
- Room code generation and validation
- Custom error classes for server operations
- Admin REST endpoints for server management

---

## Directory Structure

```
src/
├── index.ts                          - Package exports
├── types.ts                          - Server type definitions and Socket.io contracts
├── core/
│   ├── SocketServer.ts               - Express + Socket.io server (NEW - Phase 3)
│   ├── RoomManager.ts                - Multi-room orchestration and lifecycle
│   └── SocketStateSynchronizer.ts    - Socket.io + database state broadcasting
├── database/
│   ├── IDatabaseAdapter.ts           - Database abstraction interface
│   ├── InMemoryAdapter.ts            - In-memory implementation for testing
│   └── FirebaseAdapter.ts            - Firebase Realtime Database adapter (NEW - Phase 4)
└── utils/
    ├── roomCodeGenerator.ts          - 6-char room code generation
    └── errors.ts                     - Custom error classes

__tests__/
├── unit/                             - Unit tests (97 tests)
│   ├── utils/
│   ├── database/
│   └── core/
├── integration/                      - Integration tests (41 tests, NEW - Phase 3)
│   ├── socketServer.test.ts
│   ├── roomLifecycle.test.ts
│   ├── playerManagement.test.ts
│   ├── gameActions.test.ts
│   ├── adminEndpoints.test.ts
│   └── helpers/
│       ├── testServer.ts
│       └── socketClient.ts
└── __mocks__/                        - Mock Socket.io utilities for unit testing
```

---

## When to Read What

**README.md** - API reference and usage examples
- Read when: Understanding package API, implementing server, writing tests

**types.ts** - Type definitions and Socket.io event contracts
- Read when: Understanding server types, implementing event handlers, adding new events

**core/RoomManager.ts** - Multi-room orchestration
- Read when: Understanding room lifecycle, cleanup, player tracking

**core/SocketStateSynchronizer.ts** - State broadcasting
- Read when: Understanding state sync, Socket.io integration, database persistence

**database/IDatabaseAdapter.ts** - Database interface
- Read when: Implementing new database adapter (Firebase, PostgreSQL, etc.)

**database/InMemoryAdapter.ts** - Reference implementation
- Read when: Understanding adapter pattern, writing tests, implementing new adapter

**utils/roomCodeGenerator.ts** - Room code utilities
- Read when: Understanding room code format, validation, collision handling

**utils/errors.ts** - Error class hierarchy
- Read when: Adding new error types, handling server errors

---

## Key Patterns & Conventions

### Architecture Patterns
- **Backend abstraction** via IDatabaseAdapter (same pattern as IStateSynchronizer in core)
- **Composition over inheritance** - RoomManager uses Synchronizer, not extends
- **Factory pattern** - GameFactory injected for creating game instances
- **Mock utilities** - Mock Socket.io for unit testing without network I/O

### Code Conventions
- All async methods return `Promise<void>` for consistency
- Error classes extend `ServerError` with `code` and `statusCode` properties
- Socket.io events use namespaced names (`room:create`, `game:action`)
- Room IDs are 6-character uppercase alphanumeric (no ambiguous chars)

### Testing Approach
- **Unit tests** use mock Socket.io and InMemoryAdapter
- **Integration tests** (Phase 3) use real Socket.io client
- Mock utilities track emitted events for assertions
- Test coverage goal: >90%

### Resource Management
- TTL cleanup via per-room timers + periodic scans
- Shutdown handler clears all timers and maps
- Player mappings cleared on room deletion
- No memory leaks from forgotten timers

---

## Socket.io Event Flow

**Room Creation:**
```
Client: room:create → Server: RoomManager.createRoom() → Response: { roomId, state }
```

**Player Join:**
```
Client: room:join → Server: Game.addPlayer() + Synchronizer.registerPlayer() → Response: { playerId, state }
```

**State Broadcast:**
```
Game: broadcastState() → Synchronizer: io.to(room).emit('state:update') + DB.save()
```

**Player Disconnect:**
```
Socket: disconnect → Server: Game.handlePlayerDisconnect() + RoomManager.untrackPlayer()
```

---

## Phase 4: Firebase Integration ✅ Complete

**What Was Built:**
- **FirebaseAdapter class** - Full implementation of IDatabaseAdapter for Firebase Realtime Database
- **Firebase Emulator setup** - Local development with `firebase.json` and database rules
- **Comprehensive tests** - FirebaseAdapter test suite (requires Firebase emulator to run)
- **Setup documentation** - Complete guide in `docs/api/FIREBASE.md` covering:
  - Firebase project creation
  - Service account credentials
  - Local development with emulator (no Firebase account needed!)
  - Production deployment with environment variables
  - Platform-specific guides (Heroku, Railway, Render, GCP)
- **Example servers** - Production and emulator usage examples
- **Environment configuration** - `.env.example` template and `.gitignore` for credentials

**Key Features:**
- Zero-setup local development with Firebase Emulator
- Production-ready with service account authentication
- Backend-agnostic design - swap InMemoryAdapter → FirebaseAdapter with no code changes
- Automatic initialization detection (prevents duplicate apps)
- Emulator auto-detection via environment variables

---

## Milestone 3: Complete! 🎉

All server infrastructure is now production-ready:
- ✅ Phase 1: Foundation (types, adapters, utilities)
- ✅ Phase 2: Room Management (RoomManager, Synchronizer)
- ✅ Phase 3: Socket.io Integration (SocketServer, event handlers, integration tests)
- ✅ Phase 4: Firebase Integration (FirebaseAdapter, emulator, production setup)

**Current:** Milestone 8 - Second Game (Validation) — framework ready, game not started

---

## Related Documentation

- **Architecture:** `docs/architecture/server-infrastructure.md` - Detailed design and architecture
- **Core Package:** `packages/core/README.md` - Game engine API
- **Milestones:** `docs/MILESTONES.md` - Development roadmap
