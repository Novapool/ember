# @bonfire-ember/core

Core types, interfaces, and base classes for building social party games with Bonfire.

## Installation

```bash
npm install @bonfire-ember/core
```

## Quick Start

```typescript
import { SocialGame, Player, PlayerAction, ActionResult } from '@bonfire-ember/core';

// 1. Define your game state
interface MyGameState extends GameState {
  score: Record<string, number>;
  currentRound: number;
}

// 2. Create your game class by extending SocialGame
class MyPartyGame extends SocialGame<MyGameState> {
  config = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['lobby', 'playing', 'results'],
    disconnectTimeout: 30000, // 30 seconds
  };

  // Lifecycle hooks
  async onPlayerJoin(player: Player): Promise<void> {
    // Initialize player score
    this.state.score[player.id] = 0;
    console.log(`${player.name} joined!`);
  }

  async onPlayerLeave(playerId: string): Promise<void> {
    console.log(`Player ${playerId} left`);
  }

  async onGameStart(): Promise<void> {
    this.state.currentRound = 1;
    await this.transitionPhase('playing');
  }

  async onGameEnd(): Promise<void> {
    console.log('Game ended!');
  }

  async onPhaseChange(transition: PhaseTransition): Promise<void> {
    console.log(`Phase: ${transition.from} -> ${transition.to}`);
  }

  // Handle player actions
  async handleAction(action: PlayerAction): Promise<ActionResult> {
    if (action.type === 'submit-answer') {
      // Process answer...
      this.state.score[action.playerId] += 10;
      await this.updateState(this.state);
      return { success: true };
    }
    return { success: false, error: 'Unknown action' };
  }
}

// 3. Create and use your game
const game = new MyPartyGame('room-123', {
  roomId: 'room-123',
  phase: 'lobby',
  players: [],
  score: {},
  currentRound: 0,
});

// Listen to events
game.on('player:joined', ({ player }) => {
  console.log(`${player.name} joined the game!`);
});

game.on('game:started', ({ startedAt }) => {
  console.log(`Game started at ${startedAt}`);
});

// Add players
await game.joinPlayer({
  id: 'player-1',
  name: 'Alice',
  isHost: true,
  isConnected: true,
  joinedAt: Date.now(),
});

await game.joinPlayer({
  id: 'player-2',
  name: 'Bob',
  isHost: false,
  isConnected: true,
  joinedAt: Date.now(),
});

// Start when ready
if (game.canStart()) {
  await game.startGame();
}

// Handle disconnections
await game.disconnectPlayer('player-1');
// Player has 30 seconds to reconnect...
await game.reconnectPlayer('player-1');

// End game
await game.endGame();
await game.closeRoom();
```

## Core Concepts

### SocialGame Class

The `SocialGame` class is the main building block. Extend it to create your game:

- **Player Management**: Automatic join/leave/disconnect/reconnect handling
- **Lifecycle Hooks**: React to game events (onPlayerJoin, onGameStart, etc.)
- **Event System**: Subscribe to typed events for observability
- **State Sync**: Optional integration with backends (Firebase, Railway, etc.)
- **Validation**: Built-in validation for game rules

### Game State

All games must define a state that extends `GameState`:

```typescript
interface GameState {
  roomId: string;
  phase: string;
  players: Player[];
  playerOrder?: PlayerId[];       // Turn order (set by game logic)
  currentTurnIndex?: number;      // Index into playerOrder for current turn
  startedAt?: number;
  endedAt?: number;
  metadata?: Record<string, unknown>;
}
```

### Game Config

Configure your game rules:

```typescript
interface GameConfig {
  minPlayers: number;       // Minimum players to start
  maxPlayers: number;       // Maximum players allowed
  phases: string[];         // Valid game phases (must list ALL phases upfront)
  allowJoinInProgress?: boolean;  // Allow joining after start
  disconnectTimeout?: number;     // Milliseconds before removing disconnected player
  disconnectStrategy?: DisconnectStrategy; // How to handle player disconnects (default: 'reconnect-window')
}

type DisconnectStrategy =
  | 'reconnect-window'    // (default) Mark disconnected, hold spot, timeout after disconnectTimeout
  | 'close-on-host-leave' // If host disconnects, emit room:closed and delete room immediately
  | 'transfer-host'       // If host disconnects, promote next player to host, then apply reconnect-window
  | 'skip-turn';          // If current turn player disconnects, advance to next connected player
```

### Event System

Subscribe to game events for logging, analytics, or custom logic:

```typescript
game.on('player:joined', ({ player }) => { /* ... */ });
game.on('player:left', ({ playerId, reason }) => { /* ... */ });
game.on('player:disconnected', ({ playerId }) => { /* ... */ });
game.on('player:reconnected', ({ playerId }) => { /* ... */ });
game.on('game:started', ({ startedAt }) => { /* ... */ });
game.on('game:ended', ({ endedAt }) => { /* ... */ });
game.on('phase:changed', ({ from, to }) => { /* ... */ });
game.on('room:closed', ({ roomId }) => { /* ... */ });
```

### State Synchronization (Optional)

Integrate with a backend by providing an `IStateSynchronizer`:

```typescript
import { IStateSynchronizer } from '@bonfire-ember/core';

class MyBackendSync implements IStateSynchronizer<MyGameState> {
  async broadcastState(state: MyGameState): Promise<void> {
    // Send state to all clients
  }

  async sendToPlayer(playerId: string, state: MyGameState): Promise<void> {
    // Send state to specific player
  }

  async broadcastEvent(event: string, payload: unknown): Promise<void> {
    // Broadcast event to all clients
  }
}

const game = new MyPartyGame('room-123', initialState, myBackendSync);
```

## API Reference

### SocialGame Methods

- `joinPlayer(player: Player): Promise<ActionResult<Player>>` - Add a player
- `leavePlayer(playerId: string): Promise<ActionResult<void>>` - Remove a player
- `disconnectPlayer(playerId: string): Promise<ActionResult<void>>` - Mark player as disconnected
- `reconnectPlayer(playerId: string): Promise<ActionResult<void>>` - Reconnect a player
- `startGame(): Promise<ActionResult<void>>` - Start the game
- `endGame(): Promise<ActionResult<void>>` - End the game
- `closeRoom(): Promise<ActionResult<void>>` - Cleanup and close
- `on(event, handler)` - Subscribe to events
- `off(event, handler)` - Unsubscribe from events
- `getState(): GameState` - Get current state (read-only)
- `getPlayers(): Player[]` - Get all players
- `getPlayer(id): Player | undefined` - Get specific player
- `canStart(): boolean` - Check if game can start
- `canPlayerJoin(): boolean` - Check if players can join

### Protected Methods (for subclasses)

- `transitionPhase(nextPhase: string): Promise<void>` - Change game phase
- `updateState(updates: Partial<TState>): Promise<void>` - Update state immutably

### Lifecycle Hooks (must implement)

- `onPlayerJoin(player: Player): Promise<void>`
- `onPlayerLeave(playerId: string): Promise<void>`
- `onGameStart(): Promise<void>`
- `onGameEnd(): Promise<void>`
- `onPhaseChange(transition: PhaseTransition): Promise<void>`
- `handleAction(action: PlayerAction): Promise<ActionResult>`

## Examples

See the `/examples` directory for a complete game implementation:

- `simple-game.ts` — minimal `SocialGame` extension demonstrating the full lifecycle

## Development

```bash
# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# Test with UI
npm run test:ui
```

## License

MIT
