# @bonfire-ember/server

Server infrastructure for Bonfire party game framework, providing multi-room orchestration, Socket.io integration, and database abstraction.

**Status:** Milestone 3 Complete - All 4 phases done! (Tests require Firebase emulator)

---

## Features

- **Multi-room orchestration** - Manage multiple concurrent game rooms
- **Realtime communication** - Socket.io-based state synchronization
- **Backend abstraction** - Swap databases without code changes
- **Automatic cleanup** - TTL-based room expiration
- **Type-safe events** - Full TypeScript event contracts
- **Comprehensive testing** - Mock Socket.io utilities for testing

---

## Installation

```bash
npm install @bonfire-ember/server
```

**Dependencies:**
- `@bonfire-ember/core` - Game engine
- `socket.io` - Realtime communication
- `express` - HTTP server
- `firebase-admin` - Firebase integration (optional)

---

## Quick Start

**Using SocketServer (Recommended - Phase 3+):**

```typescript
import { SocketServer, InMemoryAdapter } from '@bonfire-ember/server'
import { SocialGame } from '@bonfire-ember/core'

// Create database adapter
const adapter = new InMemoryAdapter()

// Create game factory
const gameFactory = (roomId, synchronizer) => {
  return new SocialGame({
    roomId,
    maxPlayers: 8,
    stateSynchronizer: synchronizer,
    // ... your game config
  })
}

// Create and start server
const server = new SocketServer(
  {
    port: 3000,
    nodeEnv: 'development',
    room: {
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxRooms: 1000,
    },
    admin: {
      enabled: true,
      apiKey: 'your-secret-key',
    },
    cors: {
      origin: ['http://localhost:5173'],
      credentials: true,
    },
  },
  adapter,
  gameFactory,
  'my-game'
)

await server.initialize()
await server.start()
console.log('Server running on port 3000')

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.shutdown()
  process.exit(0)
})
```

**Using RoomManager directly (Advanced - Phases 1-2):**

```typescript
import { RoomManager, InMemoryAdapter } from '@bonfire-ember/server'
import { Server as SocketIOServer } from 'socket.io'
import { SocialGame } from '@bonfire-ember/core'
import express from 'express'
import { createServer } from 'http'

// Create Express + Socket.io server
const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer)

// Create database adapter
const adapter = new InMemoryAdapter()
await adapter.initialize()

// Create game factory
const gameFactory = (roomId, synchronizer) => {
  return new SocialGame({
    roomId,
    maxPlayers: 8,
    stateSynchronizer: synchronizer,
    // ... game config
  })
}

// Create room manager
const roomManager = new RoomManager(
  io,
  adapter,
  gameFactory,
  'my-game',
  {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxRooms: 1000,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  }
)

// Start cleanup
roomManager.startCleanup()

// Start server
httpServer.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

---

## API Reference

### SocketServer

**Main server class for Bonfire games** - integrates Express, Socket.io, and RoomManager into a production-ready multiplayer game server.

#### Constructor

```typescript
constructor(
  config: ServerConfig,
  databaseAdapter: IDatabaseAdapter,
  gameFactory: GameFactory<T>,
  gameType: string
)
```

**Parameters:**
- `config` - Server configuration (port, CORS, admin, room settings)
- `databaseAdapter` - Database adapter implementation (InMemoryAdapter or FirebaseAdapter)
- `gameFactory` - Function to create game instances
- `gameType` - String identifier for game type

**Server Configuration:**
```typescript
interface ServerConfig {
  port: number                          // HTTP server port
  nodeEnv?: 'development' | 'production' | 'test'

  room?: {
    defaultTTL?: number                 // Room expiration (default: 24h)
    maxRooms?: number                   // Max concurrent rooms (default: 1000)
    cleanupInterval?: number            // Cleanup scan frequency (default: 1h)
  }

  admin?: {
    enabled: boolean                    // Enable admin endpoints
    apiKey: string                      // API key for authentication
  }

  cors?: {
    origin: string[]                    // Allowed origins
    credentials: boolean                // Allow credentials
  }
}
```

#### Lifecycle Methods

##### `initialize(): Promise<void>`

Initialize the server (Express, Socket.io, RoomManager, database adapter).

```typescript
await server.initialize()
```

**What it does:**
- Initializes database adapter
- Sets up Express app with CORS
- Creates Socket.io server
- Initializes RoomManager
- Wires up event handlers
- Starts room cleanup
- Sets up admin endpoints (if enabled)

---

##### `start(): Promise<void>`

Start the HTTP server on configured port.

```typescript
await server.start()
// Server now listening on port
```

**Notes:**
- Automatically calls `initialize()` if not already initialized
- Returns promise that resolves when server is listening

---

##### `stop(): Promise<void>`

Stop the HTTP server (but keep RoomManager running).

```typescript
await server.stop()
```

**Use case:** Restart server without losing room state

---

##### `shutdown(): Promise<void>`

Gracefully shut down server and clean up all resources.

```typescript
await server.shutdown()
```

**What it does:**
- Stops cleanup timers
- Closes all Socket.io connections
- Closes database adapter
- Stops HTTP server

---

#### Utility Methods

##### `getStats(): ServerStats`

Get current server statistics.

```typescript
const stats = server.getStats()
console.log(stats)
// {
//   totalRooms: 5,
//   totalPlayers: 12,
//   roomsByStatus: { waiting: 2, playing: 3, ended: 0, closed: 0 },
//   uptime: 3600000, // milliseconds
//   memoryUsage: { rss: ..., heapUsed: ..., ... }
// }
```

**Returns:**
```typescript
interface ServerStats {
  totalRooms: number
  totalPlayers: number
  roomsByStatus: Record<string, number>
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
}
```

---

##### `getHttpServer(): HTTPServer`

Get the underlying HTTP server instance.

```typescript
const httpServer = server.getHttpServer()
```

**Use case:** Access HTTP server for additional middleware or testing

---

#### Client Events

**SocketServer handles these Socket.io events from clients:**

##### `room:create`

Create a new game room.

```typescript
socket.emit('room:create', gameType, hostName, (response) => {
  if (response.success) {
    console.log('Room created:', response.roomId)
    console.log('Initial state:', response.state)
  }
})
```

**Parameters:**
- `gameType: string` - Game type identifier
- `hostName: string` - Host player's display name
- `callback: (response: RoomCreateResponse) => void`

**Response:**
```typescript
interface RoomCreateResponse {
  success: boolean
  roomId?: RoomId        // 6-character room code
  playerId?: PlayerId    // Host player ID
  state?: GameState      // Initial game state
  error?: string
}
```

---

##### `room:join`

Join an existing room.

```typescript
socket.emit('room:join', roomId, playerName, (response) => {
  if (response.success) {
    console.log('Joined room:', response.playerId)
  }
})
```

**Parameters:**
- `roomId: RoomId` - 6-character room code
- `playerName: string` - Player's display name
- `callback: (response: RoomJoinResponse) => void`

**Response:**
```typescript
interface RoomJoinResponse {
  success: boolean
  playerId?: PlayerId
  state?: GameState
  error?: string
}
```

---

##### `room:reconnect`

Reconnect to a room after a page refresh. Session data is automatically saved to `localStorage` by the client library on `room:create` / `room:join`.

```typescript
socket.emit('room:reconnect', roomId, playerId, (response) => {
  if (response.success && response.state) {
    console.log('Reconnected to room:', response.state.roomId)
  }
})
```

**Response:**
```typescript
interface RoomReconnectResponse {
  success: boolean
  playerId?: PlayerId
  state?: GameState
  error?: string
}
```

---

##### `room:leave`

Leave the current room.

```typescript
socket.emit('room:leave', (response) => {
  if (response.success) {
    console.log('Left room')
  }
})
```

---

##### `game:start`

Start the game (host only).

```typescript
socket.emit('game:start', (response) => {
  if (response.success) {
    console.log('Game started')
  }
})
```

---

##### `game:action`

Submit a game action.

```typescript
socket.emit('game:action', 'submit-answer', { answer: 'My answer' }, (response) => {
  if (response.success) {
    console.log('Action processed')
  }
})
```

**Parameters:**
- `actionType: string` - Action identifier
- `payload: unknown` - Action data
- `callback: (response: ActionResponse) => void`

---

##### `state:request`

Request current game state (for reconnection).

```typescript
socket.emit('state:request', (response) => {
  if (response.success) {
    console.log('Current state:', response.state)
  }
})
```

---

#### Admin Endpoints

**REST endpoints for server management (require API key):**

##### `GET /health`

Health check endpoint.

```bash
curl http://localhost:3000/health
# { "status": "ok" }
```

---

##### `GET /admin/stats`

Get server statistics.

```bash
curl -H "x-api-key: your-secret-key" http://localhost:3000/admin/stats
# {
#   "totalRooms": 5,
#   "totalPlayers": 12,
#   "roomsByStatus": { "waiting": 2, "playing": 3, "ended": 0, "closed": 0 },
#   "uptime": 3600000,
#   "memoryUsage": { "rss": 52428800, "heapUsed": 18874368 }
# }
```

**Headers:**
- `x-api-key: string` - Admin API key (required)

---

##### `POST /admin/force-end/:roomId`

Force-end a room.

```bash
curl -X POST -H "x-api-key: your-secret-key" \
  http://localhost:3000/admin/force-end/A3K7N2
```

**Params:**
- `roomId: string` - Room to end

---

##### `POST /admin/kick/:roomId/:playerId`

Kick a player from a room.

```bash
curl -X POST -H "x-api-key: your-secret-key" \
  http://localhost:3000/admin/kick/A3K7N2/player-123
```

**Params:**
- `roomId: string` - Room ID
- `playerId: string` - Player to kick

---

### RoomManager

Orchestrates multiple game rooms with lifecycle management, player tracking, and automatic cleanup.

#### Constructor

```typescript
constructor(
  io: TypedSocketServer,
  databaseAdapter: IDatabaseAdapter,
  gameFactory: GameFactory<T>,
  gameType: string,
  config?: RoomManagerConfig
)
```

**Parameters:**
- `io` - Socket.io server instance (typed)
- `databaseAdapter` - Database adapter implementation
- `gameFactory` - Function to create game instances
- `gameType` - String identifier for game type
- `config` - Optional configuration

**Config Options:**
```typescript
interface RoomManagerConfig {
  defaultTTL?: number          // Room expiration time (default: 24 hours)
  maxRooms?: number            // Max concurrent rooms (default: 1000)
  cleanupInterval?: number     // Cleanup scan interval (default: 1 hour)
}
```

#### Room Management Methods

##### `createRoom(hostPlayerId: PlayerId): Promise<RoomInstance<T>>`

Create a new room with unique room code.

```typescript
const room = await roomManager.createRoom('host-player-id')
console.log(`Room created: ${room.roomId}`) // e.g., "A3K7N2"
```

**Features:**
- Generates 6-character alphanumeric room code
- Retries up to 10 times on collision
- Creates game instance via factory
- Initializes state synchronizer
- Persists metadata to database

**Throws:**
- `Error` - If max rooms limit reached
- `Error` - If unique code generation fails

---

##### `getRoom(roomId: RoomId): RoomInstance<T>`

Get room instance by ID.

```typescript
const room = roomManager.getRoom('A3K7N2')
console.log(room.game.getPlayers()) // Access game state
```

**Throws:**
- `RoomNotFoundError` - If room doesn't exist

---

##### `hasRoom(roomId: RoomId): boolean`

Check if room exists.

```typescript
if (roomManager.hasRoom('A3K7N2')) {
  // Room exists
}
```

---

##### `deleteRoom(roomId: RoomId): Promise<void>`

Delete a room and cleanup all resources.

```typescript
await roomManager.deleteRoom('A3K7N2')
```

**Cleanup:**
- Clears room cleanup timer
- Removes all player-to-room mappings
- Clears synchronizer socket mappings
- Deletes from database
- Removes from memory

---

##### `listRooms(filter?: (room: RoomInstance<T>) => boolean): RoomInfo[]`

List all rooms with optional filtering.

```typescript
// List all rooms
const allRooms = roomManager.listRooms()

// List only active rooms
const activeRooms = roomManager.listRooms(
  (room) => room.metadata.status === 'active'
)

// List rooms with space
const openRooms = roomManager.listRooms(
  (room) => room.metadata.playerCount < room.game.config.maxPlayers
)
```

**Returns:**
```typescript
interface RoomInfo {
  roomId: RoomId
  status: RoomStatus
  playerCount: number
  maxPlayers: number
  hostName: string
  gameType: string
  createdAt: number
  isPrivate?: boolean
}
```

---

#### Player Tracking Methods

##### `trackPlayer(playerId: PlayerId, roomId: RoomId): void`

Track player's current room.

```typescript
roomManager.trackPlayer('player-123', 'A3K7N2')
```

---

##### `getRoomIdForPlayer(playerId: PlayerId): RoomId | undefined`

Get room ID for a player.

```typescript
const roomId = roomManager.getRoomIdForPlayer('player-123')
if (roomId) {
  const room = roomManager.getRoom(roomId)
}
```

---

##### `untrackPlayer(playerId: PlayerId): void`

Remove player tracking.

```typescript
roomManager.untrackPlayer('player-123')
```

---

#### Activity & Metadata Methods

##### `updateActivity(roomId: RoomId): Promise<void>`

Update room's last activity timestamp and reset TTL timer.

```typescript
await roomManager.updateActivity('A3K7N2')
```

**Behavior:**
- Updates `lastActivity` to current time
- Persists to database
- Cancels existing cleanup timer
- Sets new cleanup timer for `defaultTTL` milliseconds

---

##### `updateRoomMetadata(roomId: RoomId, updates: Partial<RoomMetadata>): Promise<void>`

Update room metadata.

```typescript
await roomManager.updateRoomMetadata('A3K7N2', {
  status: 'active',
  playerCount: 5,
})
```

**Throws:**
- `RoomNotFoundError` - If room doesn't exist

---

#### Cleanup Methods

##### `startCleanup(): void`

Start periodic cleanup of inactive rooms.

```typescript
roomManager.startCleanup()
```

**Behavior:**
- Sets interval for `cleanupInterval` duration
- Queries database for rooms inactive longer than `defaultTTL`
- Deletes inactive rooms
- Safe to call multiple times (no-op if already running)

---

##### `stopCleanup(): void`

Stop periodic cleanup.

```typescript
roomManager.stopCleanup()
```

---

#### Utility Methods

##### `getRoomCount(): number`

Get total number of active rooms.

```typescript
const count = roomManager.getRoomCount()
console.log(`${count} rooms active`)
```

---

##### `getPlayerCount(): number`

Get total number of tracked players.

```typescript
const count = roomManager.getPlayerCount()
console.log(`${count} players online`)
```

---

##### `shutdown(): Promise<void>`

Gracefully shutdown room manager.

```typescript
await roomManager.shutdown()
```

**Cleanup:**
- Stops cleanup interval
- Clears all room cleanup timers
- Clears all data from memory

---

### SocketStateSynchronizer

Broadcasts game state and events via Socket.io and persists to database. Implements `IStateSynchronizer` from `@bonfire-ember/core`.

#### Constructor

```typescript
constructor(
  roomId: RoomId,
  io: TypedSocketServer,
  databaseAdapter: IDatabaseAdapter
)
```

**Parameters:**
- `roomId` - Room identifier (used as Socket.io room name)
- `io` - Socket.io server instance
- `databaseAdapter` - Database adapter for persistence

---

#### State Synchronization Methods

##### `broadcastState(state: GameState): Promise<void>`

Broadcast state to all players in room.

```typescript
await synchronizer.broadcastState(gameState)
```

**Behavior:**
- Emits `state:update` event to Socket.io room
- Persists state to database
- Both operations happen concurrently

**Socket Event:**
```typescript
// Server
io.to(roomId).emit('state:update', gameState)

// Client receives
socket.on('state:update', (state) => {
  // Update UI with new state
})
```

---

##### `sendToPlayer(playerId: PlayerId, state: GameState): Promise<void>`

Send state to specific player (for reconnection).

```typescript
await synchronizer.sendToPlayer('player-123', gameState)
```

**Behavior:**
- Looks up socket ID for player
- Emits `state:sync` event to that socket
- No-op if player socket not found (already disconnected)
- Does NOT persist to database (broadcast handles that)

**Socket Event:**
```typescript
// Server
io.to(socketId).emit('state:sync', gameState)

// Client receives
socket.on('state:sync', (state) => {
  // Sync local state after reconnection
})
```

---

##### `broadcastEvent(event: string, payload: unknown): Promise<void>`

Broadcast custom game event to room.

```typescript
await synchronizer.broadcastEvent('timer:tick', { secondsLeft: 30 })
await synchronizer.broadcastEvent('player:voted', { playerId: 'p1', vote: 'yes' })
```

**Socket Event:**
```typescript
// Server
io.to(roomId).emit('event:emit', { type: event, payload })

// Client receives
socket.on('event:emit', ({ type, payload }) => {
  if (type === 'timer:tick') {
    // Update timer UI
  }
})
```

---

#### Player Mapping Methods

##### `registerPlayer(playerId: PlayerId, socketId: string): void`

Register player's socket ID for targeted sends.

```typescript
synchronizer.registerPlayer('player-123', 'socket-abc')
```

**Usage:**
```typescript
io.on('connection', (socket) => {
  socket.on('room:join', (roomId, playerName, callback) => {
    const { playerId } = await game.addPlayer(playerName)

    // Register for targeted sends
    synchronizer.registerPlayer(playerId, socket.id)

    // Join Socket.io room for broadcasts
    socket.join(roomId)
  })
})
```

---

##### `unregisterPlayer(playerId: PlayerId): void`

Unregister player's socket mapping.

```typescript
synchronizer.unregisterPlayer('player-123')
```

---

##### `clearPlayerMappings(): void`

Clear all player-socket mappings (room cleanup).

```typescript
synchronizer.clearPlayerMappings()
```

---

### IDatabaseAdapter

Backend-agnostic interface for database operations. Implement this interface to support different databases.

#### Required Methods

```typescript
interface IDatabaseAdapter {
  // Lifecycle
  initialize(): Promise<void>
  close(): Promise<void>

  // Game state
  saveGameState(roomId: RoomId, state: GameState): Promise<void>
  loadGameState(roomId: RoomId): Promise<GameState | null>

  // Room metadata
  updateRoomMetadata(roomId: RoomId, metadata: RoomMetadata): Promise<void>
  getRoomMetadata(roomId: RoomId): Promise<RoomMetadata | null>
  getAllRoomMetadata(): Promise<RoomMetadata[]>

  // Cleanup
  getInactiveRooms(olderThan: number): Promise<RoomId[]>
  deleteRoom(roomId: RoomId): Promise<void>
  roomExists(roomId: RoomId): Promise<boolean>
}
```

---

### InMemoryAdapter

In-memory database adapter for testing and development.

#### Constructor

```typescript
constructor()
```

#### Usage

```typescript
const adapter = new InMemoryAdapter()
await adapter.initialize()

// Use with RoomManager
const roomManager = new RoomManager(io, adapter, gameFactory, 'my-game')
```

**Features:**
- Stores data in JavaScript Maps
- Fully synchronous (wrapped in Promises)
- No persistence (data lost on restart)
- Perfect for testing

**Limitations:**
- ⚠️ NOT for production use
- ⚠️ No data persistence
- ⚠️ Single-process only

---

### FirebaseAdapter

Firebase Realtime Database adapter for production persistence.

#### Constructor

```typescript
constructor(config: FirebaseAdapterConfig)
```

**Configuration:**
```typescript
interface FirebaseAdapterConfig {
  projectId: string        // Firebase project ID
  databaseURL: string      // Firebase Realtime Database URL
  credentialsPath?: string // Path to service account JSON
  credentials?: object     // Service account object
  useEmulator?: boolean    // Use Firebase emulator (local dev)
}
```

#### Usage

**Production (with credentials file):**
```typescript
import { FirebaseAdapter } from '@bonfire-ember/server'

const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  credentialsPath: '/path/to/firebase-service-account.json',
})

await adapter.initialize()

// Use with SocketServer
const server = new SocketServer({
  port: 3000,
  databaseAdapter: adapter,
  gameFactory: () => new SocialGame(),
  // ... other config
})
```

**Local Development (with emulator):**
```typescript
const adapter = new FirebaseAdapter({
  projectId: 'bonfire-dev',
  databaseURL: 'http://localhost:9000?ns=bonfire-dev',
  useEmulator: true, // Connects to Firebase Emulator
})

await adapter.initialize()
```

**Features:**
- ✅ Production-ready persistence
- ✅ Automatic data synchronization
- ✅ Firebase Emulator support for local development
- ✅ No credentials needed for emulator
- ✅ Real-time data updates
- ✅ Scalable for production use

**Setup:**
1. **Local Development:**
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Start emulator: `npm run firebase:emulator`
   - No Firebase account required!

2. **Production:**
   - Create Firebase project at https://console.firebase.google.com
   - Enable Realtime Database
   - Download service account credentials
   - Test connection: `npm run firebase:test`
   - See `docs/api/FIREBASE.md` for complete setup guide

**Database Structure:**
```
/rooms/
  /{roomId}/
    /state - Game state object
    /metadata - Room metadata
```

---

## Types

### Server Configuration

```typescript
interface ServerConfig {
  port: number
  nodeEnv?: 'development' | 'production' | 'test'

  firebase?: {
    projectId: string
    databaseURL: string
    credentialsPath?: string
  }

  room?: {
    defaultTTL?: number
    maxRooms?: number
    cleanupInterval?: number
  }

  rateLimit?: {
    windowMs?: number
    maxRequests?: number
  }

  admin?: {
    enabled?: boolean
    apiKey?: string
  }

  cors?: {
    origin: string | string[]
    credentials?: boolean
  }
}
```

---

### Socket.io Event Contracts

**Client → Server:**
```typescript
interface ClientToServerEvents {
  'room:create': (gameType: string, hostName: string, callback: (response: RoomCreateResponse) => void) => void
  'room:join': (roomId: RoomId, playerName: string, callback: (response: RoomJoinResponse) => void) => void
  'room:leave': (callback?: (response: BaseResponse) => void) => void
  'room:reconnect': (roomId: RoomId, playerId: PlayerId, callback: (response: RoomReconnectResponse) => void) => void
  'game:start': (callback?: (response: BaseResponse) => void) => void
  'game:action': (actionType: string, payload: unknown, callback?: (response: ActionResponse) => void) => void
  'state:request': (callback: (response: StateResponse) => void) => void
}
```

**Server → Client:**
```typescript
interface ServerToClientEvents {
  'state:update': (state: GameState) => void
  'state:sync': (state: GameState) => void
  'event:emit': (event: { type: string; payload: unknown }) => void
  'error': (error: ErrorResponse) => void
  'room:closed': (reason: string) => void
}
```

---

### Room Data Structures

```typescript
interface RoomInstance<T extends SocialGame<any>> {
  roomId: RoomId
  game: T
  synchronizer: SocketStateSynchronizer<any>
  metadata: RoomMetadata
  cleanupTimer?: NodeJS.Timeout
}

interface RoomMetadata {
  roomId: RoomId
  createdAt: number
  lastActivity: number
  hostId: PlayerId
  playerCount: number
  status: RoomStatus
  gameType: string
  custom?: Record<string, unknown>
}

interface RoomInfo {
  roomId: RoomId
  status: RoomStatus
  playerCount: number
  maxPlayers: number
  hostName: string
  gameType: string
  createdAt: number
  isPrivate?: boolean
}
```

---

## Utilities

### Room Code Generation

```typescript
import { generateRoomCode, isValidRoomCode } from '@bonfire-ember/server'

const roomId = generateRoomCode() // e.g., "A3K7N2"
const isValid = isValidRoomCode(roomId) // true
```

**Room Code Format:**
- 6 characters
- Uppercase alphanumeric
- Excludes ambiguous characters (0/O, 1/I/l)
- Characters: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`

---

### Error Classes

```typescript
import {
  ServerError,
  RoomNotFoundError,
  RoomFullError,
  RoomClosedError,
  UnauthorizedError,
  ValidationError,
} from '@bonfire-ember/server'

try {
  const room = roomManager.getRoom(roomId)
} catch (error) {
  if (error instanceof RoomNotFoundError) {
    socket.emit('error', {
      message: 'Room not found',
      code: 'ROOM_NOT_FOUND',
    })
  }
}
```

**Error Hierarchy:**
```typescript
ServerError (extends Error)
├── RoomNotFoundError
├── RoomFullError
├── RoomClosedError
├── UnauthorizedError
└── ValidationError
```

---

## Testing

### Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run with coverage
npm run test:coverage

# Test Firebase connection (production)
npm run firebase:test

# Run Firebase unit tests with emulator
npm run test:firebase
```

**Note:** Firebase tests require the emulator to be running:
```bash
# Terminal 1: Start emulator
npm run firebase:emulator

# Terminal 2: Run tests
npm run test:firebase
```

### Mock Socket.io Utilities

For testing server code that uses Socket.io:

```typescript
import { MockSocket, MockSocketServer } from '@bonfire-ember/server/__mocks__/mockSocketIo'

// Create mock server
const mockIo = new MockSocketServer()

// Create mock socket
const mockSocket = new MockSocket()

// Use with synchronizer
const sync = new SocketStateSynchronizer('room1', mockIo, adapter)

// Verify emitted events
expect(mockSocket.emittedEvents).toContainEqual({
  event: 'state:update',
  args: [gameState]
})
```

**Mock API:**
```typescript
class MockSocket {
  rooms: Set<string>
  emittedEvents: Array<{ event: string; args: any[] }>

  emit(event: string, ...args: any[]): void
  join(room: string): void
  leave(room: string): void
  to(room: string): MockSocket
}

class MockSocketServer {
  sockets: Map<string, MockSocket>
  rooms: Map<string, Set<string>>

  to(room: string): MockSocket
  emit(event: string, ...args: any[]): void
}
```

---

## Examples

### Complete Server Setup

```typescript
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { RoomManager, InMemoryAdapter } from '@bonfire-ember/server'
import { SocialGame } from '@bonfire-ember/core'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
})

const adapter = new InMemoryAdapter()
await adapter.initialize()

const gameFactory = (roomId, synchronizer) => {
  return new SocialGame({
    roomId,
    maxPlayers: 8,
    stateSynchronizer: synchronizer,
  })
}

const roomManager = new RoomManager(io, adapter, gameFactory, 'party-game')
roomManager.startCleanup()

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id)

  socket.on('room:create', async (gameType, hostName, callback) => {
    try {
      const room = await roomManager.createRoom(socket.id)
      const { playerId } = await room.game.addPlayer(hostName, { isHost: true })

      room.synchronizer.registerPlayer(playerId, socket.id)
      socket.join(room.roomId)
      roomManager.trackPlayer(socket.id, room.roomId)

      callback({ success: true, roomId: room.roomId, state: room.game.getState() })
    } catch (error) {
      callback({ success: false, error: error.message })
    }
  })

  socket.on('room:join', async (roomId, playerName, callback) => {
    try {
      const room = roomManager.getRoom(roomId)
      const { playerId } = await room.game.addPlayer(playerName)

      room.synchronizer.registerPlayer(playerId, socket.id)
      socket.join(roomId)
      roomManager.trackPlayer(socket.id, roomId)

      callback({ success: true, playerId, state: room.game.getState() })
    } catch (error) {
      callback({ success: false, error: error.message })
    }
  })

  socket.on('disconnect', () => {
    const roomId = roomManager.getRoomIdForPlayer(socket.id)
    if (roomId) {
      const room = roomManager.getRoom(roomId)
      room.game.handlePlayerDisconnect(socket.id)
      roomManager.untrackPlayer(socket.id)
    }
  })
})

httpServer.listen(3000)
```

---

## Architecture

See `docs/architecture/server-infrastructure.md` for detailed architecture documentation including:
- Design decisions and patterns
- Data flow diagrams
- Testing strategy
- Production considerations
- Phase 3 & 4 roadmap

---

## Phase Status

**Phase 1: Foundation** ✅ Complete
- Package setup, types, room code generator, errors, database abstraction, InMemoryAdapter

**Phase 2: Room Management Core** ✅ Complete
- RoomManager, SocketStateSynchronizer, mock Socket.io utilities, 97 tests

**Phase 3: Socket.io Integration** ✅ Complete
- SocketServer class, event handlers, integration tests, 41 integration tests

**Phase 4: Firebase Integration** ✅ Complete
- FirebaseAdapter implementation, emulator setup, production deployment guide

---

## License

MIT
