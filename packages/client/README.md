# @bonfire/client

React hooks and utilities for building Bonfire party game UIs.

**Status:** Milestone 4 + 5 + 6 + 7 Complete — 242 tests, all passing

---

## Features

- **BonfireClient** - Promise-based Socket.io wrapper with subscription model
- **BonfireProvider** - React context provider with auto-connect/cleanup
- **11 React hooks** - Type-safe hooks for state, connection, room, player, phase, events, turn management, countdown timers, and session restoration
- **BonfireErrorBoundary** - Error boundary component for graceful error handling
- **8 UI components** - Lobby, PlayerAvatar, Timer, PromptCard, ResponseInput, RevealPhase, GameProgress, VotingInterface
- **colorHash utility** - Deterministic player color generation
- **Storybook 8** - Visual documentation for all components
- **Inline styles** - Zero-dependency styling via shared `theme.ts` constants — no CSS setup required
- **useSyncExternalStore** - Native React 18 external state synchronization
- **TypeScript** - Full type safety for game state and events
- **Comprehensive tests** - MockBonfireClient for easy testing

---

## Installation

```bash
npm install @bonfire/client socket.io-client
```

> **Build order matters:** When using local `file:` references, build the Bonfire packages first before running your game app:
> ```bash
> cd bonfire && npm run build   # build @bonfire/core, /server, /client first
> cd ../my-game && npm install  # then install
> ```

**Dependencies:**
- `@bonfire/core` - Core types and interfaces
- `socket.io-client` - Realtime communication
- `react` - React 18+ (peer dependency)

---

## Quick Start

### 1. Set up BonfireProvider

Wrap your app with `BonfireProvider` to make Bonfire hooks available:

```tsx
import { BonfireProvider, BonfireClient } from '@bonfire/client';
import { GameState } from '@bonfire/core';

// Option A: Pass config (provider creates client)
function App() {
  return (
    <BonfireProvider config={{ url: 'http://localhost:3000' }}>
      <GameUI />
    </BonfireProvider>
  );
}

// Option B: Pass pre-created client (advanced usage)
const client = new BonfireClient({ url: 'http://localhost:3000' });

function App() {
  return (
    <BonfireProvider client={client}>
      <GameUI />
    </BonfireProvider>
  );
}
```

### 2. Use Bonfire Hooks in Your Components

```tsx
import { useGameState, useConnection, useRoom, usePlayer } from '@bonfire/client';

function GameUI() {
  const { state } = useGameState();
  const { status } = useConnection();
  const { createRoom, joinRoom, startGame } = useRoom();
  const { player, isHost } = usePlayer();

  if (status !== 'connected') {
    return <div>Connecting...</div>;
  }

  if (!state) {
    return (
      <div>
        <button onClick={() => createRoom()}>Create Room</button>
        <button onClick={() => joinRoom('ABC123', 'Player1')}>Join Room</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Room: {state.roomId}</h1>
      <p>Phase: {state.phase}</p>
      <p>Players: {state.playerOrder?.length ?? 0}</p>

      {isHost && state.phase === 'lobby' && (
        <button onClick={() => startGame()}>Start Game</button>
      )}

      {/* Your game UI here */}
    </div>
  );
}
```

### 3. Add Error Boundary

Wrap components with `BonfireErrorBoundary` to catch and display errors:

```tsx
import { BonfireErrorBoundary } from '@bonfire/client';

function App() {
  return (
    <BonfireProvider config={{ url: 'http://localhost:3000' }}>
      <BonfireErrorBoundary
        fallback={<div>Something went wrong. <button onClick={() => window.location.reload()}>Reload</button></div>}
      >
        <GameUI />
      </BonfireErrorBoundary>
    </BonfireProvider>
  );
}
```

---

## API Reference

### BonfireClient

Low-level Socket.io client wrapper. Usually used via `BonfireProvider` and hooks.

```typescript
import { BonfireClient } from '@bonfire/client';

const client = new BonfireClient({
  url: 'http://localhost:3000',
  autoConnect: false, // optional, default: false
});
```

**Methods:**

```typescript
// Connection
client.connect(): void
client.disconnect(): void

// Room Management
await client.createRoom(gameType: string, hostName: string): Promise<RoomCreateResponse>
await client.joinRoom(roomId: string, playerName: string): Promise<RoomJoinResponse>
await client.leaveRoom(): Promise<BaseResponse>
await client.reconnectToRoom(roomId: string, playerId: string): Promise<RoomReconnectResponse>

// Session persistence (localStorage)
client.loadSession(): { roomId: string; playerId: string } | null

// Game Actions
await client.startGame(): Promise<BaseResponse>
await client.sendAction(actionType: string, payload: unknown): Promise<ActionResponse>
await client.requestState(): Promise<StateResponse>

// Subscriptions (return unsubscribe functions)
client.onStateChange(callback: (state: GameState) => void): () => void
client.onStatusChange(callback: (status: ConnectionStatus) => void): () => void
client.onError(callback: (error: ErrorResponse) => void): () => void
client.onGameEvent(eventType: string, callback: (payload: any) => void): () => void
client.onRoomClosed(callback: (reason: string) => void): () => void

// Advanced
client.getSocket(): TypedClientSocket
```

**Properties:**

```typescript
client.gameState: GameState | null  // Current game state
client.status: ConnectionStatus      // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
client.playerId: string | null
client.roomId: string | null
client.isConnected: boolean
```

---

### BonfireProvider

React context provider for BonfireClient. Auto-connects on mount and cleans up on unmount.

```typescript
interface BonfireProviderProps {
  // Option 1: Pass client directly (advanced)
  client?: BonfireClient;

  // Option 2: Pass config (provider creates client)
  config?: BonfireClientConfig; // { url: string; autoConnect?: boolean; ... }
  autoConnect?: boolean;

  children: React.ReactNode;
}
```

**Example:**

```tsx
// Simple setup — note: config.url, not serverUrl
<BonfireProvider config={{ url: 'http://localhost:3000' }}>
  <App />
</BonfireProvider>

// Advanced setup with custom client
const client = new BonfireClient({ url: process.env.SERVER_URL });
<BonfireProvider client={client}>
  <App />
</BonfireProvider>
```

---

### Hooks

All hooks must be used inside a `BonfireProvider`.

#### useGameState()

Access current game state with reactive updates.

```typescript
function useGameState(): {
  state: GameState | null;
  requestState: () => Promise<void>;
}
```

**Example:**

```tsx
function GameBoard() {
  const { state, requestState } = useGameState();

  useEffect(() => {
    // Request latest state on mount
    requestState();
  }, []);

  if (!state) return <div>No active game</div>;

  return (
    <div>
      <h2>Phase: {state.phase}</h2>
      <p>Players: {state.playerOrder.length}/{state.config.maxPlayers}</p>
    </div>
  );
}
```

**Type-safe custom state:**

```tsx
interface MyGameState extends GameState {
  score: Record<string, number>;
  currentRound: number;
}

function ScoreBoard() {
  const { state } = useGameState();

  if (!state) return null;

  // Access custom fields (type-safe if you use TypeScript generics)
  const scores = (state as MyGameState).score;

  return (
    <ul>
      {Object.entries(scores).map(([playerId, score]) => (
        <li key={playerId}>{playerId}: {score}</li>
      ))}
    </ul>
  );
}
```

---

#### useConnection()

Manage connection status and manual connect/disconnect.

```typescript
function useConnection(): {
  status: ConnectionStatus; // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  connect: () => void;
  disconnect: () => void;
}
```

**Example:**

```tsx
function ConnectionIndicator() {
  const { status, connect, disconnect } = useConnection();

  return (
    <div>
      <span>Status: {status}</span>
      {status === 'disconnected' && <button onClick={connect}>Connect</button>}
      {status === 'connected' && <button onClick={disconnect}>Disconnect</button>}
    </div>
  );
}
```

---

#### useRoom()

Room management and game actions.

```typescript
function useRoom(): {
  roomId: string | null;
  isInRoom: boolean;
  createRoom: (gameType: string, hostName: string) => Promise<RoomCreateResponse>;
  joinRoom: (roomId: string, playerName: string) => Promise<RoomJoinResponse>;
  leaveRoom: () => Promise<BaseResponse>;
  startGame: () => Promise<BaseResponse>;
  sendAction: (actionType: string, payload: unknown) => Promise<ActionResponse>;
  reconnectToRoom: (roomId: string, playerId: string) => Promise<RoomReconnectResponse>;
}
```

**Example:**

```tsx
function LobbyScreen() {
  const { createRoom, joinRoom } = useRoom();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  return (
    <div>
      <button onClick={createRoom}>Create New Room</button>

      <div>
        <input
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <input
          placeholder="Your Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button onClick={() => joinRoom(roomCode, playerName)}>Join Room</button>
      </div>
    </div>
  );
}
```

**Sending game actions:**

```tsx
function GameControls() {
  const { sendAction } = useRoom();

  const submitAnswer = async (answer: string) => {
    try {
      // sendAction takes two args: actionType string + payload object
      await sendAction('submit_answer', { answer });
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  return <button onClick={() => submitAnswer('My answer')}>Submit</button>;
}
```

---

#### usePlayer()

Access current player information and player list.

```typescript
function usePlayer(): {
  player: Player | null;  // The current player (NOT currentPlayer)
  playerId: string | null;
  players: Player[];
  isHost: boolean;
}
```

**Example:**

```tsx
function PlayerList() {
  const { player, players, isHost } = usePlayer();

  return (
    <div>
      <h3>Players ({players.length})</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.id === player?.id && ' (You)'}
            {p.isHost && ' 👑'}
          </li>
        ))}
      </ul>

      {isHost && <p>You are the host!</p>}
    </div>
  );
}
```

---

#### usePhase()

Track current game phase.

```typescript
function usePhase(): Phase | null  // Returns the value directly, not an object
```

**Example:**

```tsx
function GameScreen() {
  const phase = usePhase();  // Direct value, not { phase }

  if (phase === 'lobby') return <LobbyUI />;
  if (phase === 'playing') return <GameplayUI />;
  if (phase === 'results') return <ResultsUI />;

  return <div>Unknown phase: {phase}</div>;
}
```

---

#### useBonfireEvent()

Subscribe to custom game events with auto-cleanup.

```typescript
function useBonfireEvent<T = any>(
  eventType: string,
  callback: (payload: T) => void
): void
```

**Example:**

```tsx
function GameNotifications() {
  const [message, setMessage] = useState('');

  // Listen for custom 'player_scored' events
  useBonfireEvent('player_scored', (payload: { playerId: string; points: number }) => {
    setMessage(`Player ${payload.playerId} scored ${payload.points} points!`);
    setTimeout(() => setMessage(''), 3000);
  });

  return message ? <div className="notification">{message}</div> : null;
}
```

**Auto-cleanup:** The event listener is automatically removed when the component unmounts or when the event type changes.

---

#### useTurn()

Convenience hook for turn-based games. Derives who the current turn player is from `currentTurnIndex` in game state, eliminating manual `playerOrder` indexing in game UIs.

Requires `currentTurnIndex` to be set in game state by server-side game logic.

```typescript
function useTurn(): {
  isMyTurn: boolean;
  currentPlayerId: PlayerId | null;
  currentPlayer: Player | null;
  turnIndex: number | null;
}
```

**Example:**

```tsx
function TurnIndicator() {
  const { isMyTurn, currentPlayer, turnIndex } = useTurn();

  if (isMyTurn) return <div className="banner">Your turn!</div>;
  return <div>Waiting for {currentPlayer?.name}…</div>;
}
```

**Note:** Returns all nulls when `state.currentTurnIndex` or `state.playerOrder` is not set (e.g., in non-turn-based phases).

---

#### useCountdown()

Synchronized countdown timer. All clients show the same remaining time regardless of when they mounted, because the hook computes remaining time from an absolute timestamp rather than counting down from mount.

```typescript
function useCountdown(timerEndsAt: number | null | undefined): number
// Returns seconds remaining (integer, ≥ 0). Returns 0 when expired or timerEndsAt is falsy.
```

**Example:**

```tsx
function TurnTimer() {
  const { state } = useGameState();
  const secondsLeft = useCountdown(state?.timerEndsAt);

  return <div>{secondsLeft}s remaining</div>;
}
```

**How it works:** The server sets `state.timerEndsAt = Date.now() + durationMs` when a turn starts. Each client calls `useCountdown(state.timerEndsAt)` and derives remaining seconds from the same absolute timestamp — so all clients count down in sync.

---

#### useSession()

Automatically restores a saved Bonfire session on mount. Handles the page-refresh reconnect flow without manual wiring.

```typescript
function useSession(): {
  isRestoring: boolean;  // true while reconnect attempt is in flight
  restored: boolean;     // true if reconnect succeeded
  failed: boolean;       // true if reconnect was attempted but failed (room gone, etc.)
}
```

**Example:**

```tsx
function GameRouter() {
  const { isRestoring } = useSession();
  const phase = usePhase();

  // isRestoring starts true when a saved session exists — prevents landing-screen flash
  if (isRestoring) return <ReconnectingScreen />;
  if (!phase) return <LandingScreen />;

  if (phase === 'lobby') return <Lobby />;
  if (phase === 'playing') return <Game />;
  return null;
}
```

**How it works:** On mount, `useSession` checks `localStorage` for a saved session. When the socket connects, it calls `reconnectToRoom` automatically. `isRestoring` is initialized to `true` (not `false`) when a saved session exists — this prevents the landing screen from flashing before the reconnect completes.

---

### Reconnection (Page Refresh Recovery)

Bonfire automatically saves session data to `localStorage` whenever a player creates or joins a room. The recommended approach is to use `useSession()` (above), which handles reconnect automatically. For manual control, use `loadSession()` + `reconnectToRoom()`:

```tsx
function App() {
  const { reconnectToRoom } = useRoom();
  const { client } = useBonfireContext();

  useEffect(() => {
    const session = client.loadSession();
    if (session) {
      reconnectToRoom(session.roomId, session.playerId);
    }
  }, []);

  // ...
}
```

**How it works:**
- `createRoom` / `joinRoom` automatically save `{ roomId, playerId }` to `localStorage`
- `leaveRoom` / `room:closed` automatically clear the saved session
- `reconnectToRoom` emits `room:reconnect` to the server and restores client state on success

---

### BonfireErrorBoundary

React error boundary for catching and displaying errors in game UI.

```typescript
interface BonfireErrorBoundaryProps {
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  children: React.ReactNode;
}
```

**Example with static fallback:**

```tsx
<BonfireErrorBoundary fallback={<div>Something went wrong</div>}>
  <GameUI />
</BonfireErrorBoundary>
```

**Example with render function:**

```tsx
<BonfireErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>Error: {error.message}</h2>
      <button onClick={reset}>Try Again</button>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  )}
>
  <GameUI />
</BonfireErrorBoundary>
```

---

## UI Components

Pre-built React components for common party game UI patterns. Components use inline styles — no Tailwind or external CSS required. Import and use with zero consumer setup.

### PlayerAvatar

Renders a player's avatar as a colored circle with initials. Color is deterministically generated from the player's name.

```tsx
import { PlayerAvatar } from '@bonfire/client';

<PlayerAvatar
  name="Alice"
  size="md"          // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showStatus={true}
  isOnline={true}
  isHost={true}
/>
```

### Timer

Countdown timer with an optional circular SVG progress ring.

```tsx
import { Timer } from '@bonfire/client';

<Timer
  duration={60}           // seconds
  onComplete={() => nextPhase()}
  showProgress={true}
  variant="default"       // 'default' | 'warning' | 'danger'
  size="md"               // 'sm' | 'md' | 'lg'
  autoStart={true}
/>
```

### Lobby

Full pre-built lobby screen. Connects to game state via hooks internally — no wiring required.

```tsx
import { Lobby } from '@bonfire/client';

// Minimal usage — reads room code and players from game state automatically
<Lobby />

// With overrides
<Lobby
  roomCode="ABC123"
  showReadyStates={true}
  hideStartButton={false}
  onStart={() => customStart()}
  renderPlayer={(player, isHost) => <MyPlayerRow player={player} isHost={isHost} />}
/>
```

### PromptCard

Themed card for displaying questions, prompts, or dares.

```tsx
import { PromptCard } from '@bonfire/client';

<PromptCard
  prompt="What is your biggest fear?"
  variant="spicy"        // 'standard' | 'spicy' | 'creative' | 'dare'
  category="Deep Dive"   // overrides the variant badge label
  round={2}
  totalRounds={5}
  subtitle="Everyone answers, then compare."
  animate={true}
/>
```

### ResponseInput

Polymorphic input component — mode is determined by `config.type`.

```tsx
import { ResponseInput } from '@bonfire/client';

// Text input
<ResponseInput
  config={{ type: 'text', placeholder: 'Type your answer…', maxLength: 200, multiline: false }}
  value={answer}
  onChange={setAnswer}
  onSubmit={handleSubmit}
/>

// Multiple choice (single-select)
<ResponseInput
  config={{
    type: 'multiple-choice',
    choices: [
      { id: 'a', label: 'Option A', description: 'The first option' },
      { id: 'b', label: 'Option B' },
    ],
    allowMultiple: false,
  }}
  value={selected}
  onChange={setSelected}
  onSubmit={handleSubmit}
/>

// Ranking
<ResponseInput
  config={{
    type: 'ranking',
    items: [
      { id: 'p1', label: 'Alice' },
      { id: 'p2', label: 'Bob' },
      { id: 'p3', label: 'Charlie' },
    ],
  }}
  value={ranking}
  onChange={setRanking}
  onSubmit={handleSubmit}
/>
```

### Composing PromptCard + ResponseInput

The `PromptCard` children slot is designed for `ResponseInput`:

```tsx
<PromptCard prompt="Rank these from best to worst" variant="creative" round={1} totalRounds={3}>
  <ResponseInput
    config={{ type: 'ranking', items: choices }}
    value={ranking}
    onChange={setRanking}
    onSubmit={handleSubmit}
  />
</PromptCard>
```

### RevealPhase

Sequentially reveals a list of items with configurable animation delays. Useful for answer reveals, score announcements, or any staged disclosure pattern.

```tsx
import { RevealPhase } from '@bonfire/client';

<RevealPhase
  items={[
    { id: '1', content: 'Alice answered: Spaghetti' },
    { id: '2', content: 'Bob answered: Pizza' },
  ]}
  delayBetween={800}             // ms between each reveal (default: 600)
  animateIn={true}               // slide-in animation (default: true)
  onRevealComplete={() => nextPhase()}
/>
```

Custom render per item:

```tsx
<RevealPhase
  items={answers}
  renderItem={(item, index) => (
    <div className="answer-card">
      <span className="rank">#{index + 1}</span>
      <span>{item.content}</span>
    </div>
  )}
  delayBetween={1000}
  onRevealComplete={handleComplete}
/>
```

### GameProgress

Displays current progress through rounds or phases. Supports three visual variants.

```tsx
import { GameProgress } from '@bonfire/client';

// Progress bar
<GameProgress
  current={2}
  total={5}
  variant="bar"          // 'bar' | 'dots' | 'number'
  label="Round"
/>

// Dot indicators
<GameProgress current={3} total={5} variant="dots" />

// Numeric display
<GameProgress current={3} total={5} variant="number" label="Question" />
```

All variants include an ARIA `progressbar` role for accessibility.

### VotingInterface

Full voting UI with live results display, vote counts, percentage bars, and winner highlighting.

```tsx
import { VotingInterface } from '@bonfire/client';

// Voting in progress
<VotingInterface
  options={[
    { id: 'a', label: 'Option A' },
    { id: 'b', label: 'Option B' },
    { id: 'c', label: 'Option C' },
  ]}
  onVote={(optionId) => sendAction({ type: 'vote', payload: { optionId } })}
  selectedId={myVoteId}
  disabled={hasVoted}
/>

// Results display (after voting closes)
<VotingInterface
  options={[
    { id: 'a', label: 'Option A', votes: 3 },
    { id: 'b', label: 'Option B', votes: 7 },
    { id: 'c', label: 'Option C', votes: 1 },
  ]}
  showResults={true}
  totalVotes={11}
/>
```

### colorHash Utility

```typescript
import { getPlayerColor, getPlayerInitials } from '@bonfire/client';

getPlayerColor('Alice')     // '#...' — deterministic hex color
getPlayerInitials('Alice')  // 'AL'
getPlayerInitials('Bob')    // 'B'
```

### Storybook

Run the interactive component playground:

```bash
cd packages/client && npm run storybook
```

---

## TypeScript Types

All types are fully exported and type-safe:

```typescript
import type {
  BonfireClientConfig,
  ConnectionStatus,
  BaseResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  RoomReconnectResponse,
  StateResponse,
  ActionResponse,
  ErrorResponse,
  BonfireGameEvent,
} from '@bonfire/client';
```

**Type Definitions:**

```typescript
interface BonfireClientConfig {
  url: string;                          // Server URL, e.g. "http://localhost:3000"
  socketOptions?: Record<string, unknown>;
  autoConnect?: boolean;                // default: false
  reconnection?: boolean;               // default: true
  reconnectionAttempts?: number;        // default: 5
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface BaseResponse {
  success: boolean;
  error?: string;
  code?: string;
}

interface RoomCreateResponse extends BaseResponse {
  roomId?: string;
  state?: GameState;
}

interface RoomJoinResponse extends BaseResponse {
  playerId?: string;
  state?: GameState;
}

interface RoomReconnectResponse extends BaseResponse {
  playerId?: string;
  state?: GameState;
}

interface BonfireGameEvent {
  type: string;
  payload: unknown;
}
```

---

## Testing

Use `MockBonfireClient` from test fixtures for easy testing:

```typescript
import { renderWithProvider } from './__tests__/fixtures/renderWithProvider';
import { mockBonfireClient } from './__tests__/fixtures/mockBonfireClient';

test('displays player count', () => {
  const client = mockBonfireClient();
  client.simulateState({
    phase: 'lobby',
    playerOrder: ['p1', 'p2'],
    // ... other state
  });

  const { getByText } = renderWithProvider(<PlayerList />, client);
  expect(getByText('Players (2)')).toBeInTheDocument();
});
```

**MockBonfireClient methods:**

```typescript
client.simulateState(state: GameState): void
client.simulateStatus(status: ConnectionStatus): void
client.simulateError(error: ErrorResponse): void
client.simulateEvent(type: string, payload: any): void
client.simulateRoomClosed(): void
```

---

## Architecture

The client library uses **React 18's `useSyncExternalStore`** to synchronize React component state with the external Socket.io client. This ensures:

- **Automatic re-renders** when server state changes
- **No stale state** from race conditions
- **Concurrent Mode compatible** for React 18+
- **Efficient updates** only when subscribed data changes

**Architecture diagram:**

```
Socket.io Server
       ↓
BonfireClient (subscription model)
       ↓
BonfireProvider (React Context)
       ↓
Hooks (useSyncExternalStore)
       ↓
Your Components (re-render on state change)
```

For detailed architecture documentation, see `docs/architecture/client-library.md`.

---

## Examples

### Complete Game UI Example

```tsx
import { BonfireProvider, useGameState, useRoom, usePlayer, usePhase } from '@bonfire/client';

function App() {
  return (
    <BonfireProvider config={{ url: 'http://localhost:3000' }}>
      <BonfireErrorBoundary>
        <Game />
      </BonfireErrorBoundary>
    </BonfireProvider>
  );
}

function Game() {
  const { state } = useGameState();
  const phase = usePhase();

  if (!state) return <LobbyScreen />;
  if (phase === 'lobby') return <WaitingRoom />;
  if (phase === 'playing') return <Gameplay />;
  if (phase === 'results') return <Results />;

  return null;
}

function LobbyScreen() {
  const { createRoom, joinRoom } = useRoom();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  return (
    <div>
      <h1>Party Game</h1>
      <button onClick={createRoom}>Create Room</button>
      <input placeholder="Room Code" value={code} onChange={(e) => setCode(e.target.value)} />
      <input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={() => joinRoom(code, name)}>Join Room</button>
    </div>
  );
}

function WaitingRoom() {
  const { state } = useGameState();
  const { player, players, isHost } = usePlayer();
  const { startGame } = useRoom();

  return (
    <div>
      <h2>Room: {state?.roomId}</h2>
      <h3>Players:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>{p.name} {p.isHost && '👑'}</li>
        ))}
      </ul>
      {isHost && <button onClick={startGame}>Start Game</button>}
    </div>
  );
}

function Gameplay() {
  const { sendAction } = useRoom();

  return (
    <div>
      <h2>Playing...</h2>
      <button onClick={() => sendAction('submit', { answer: 'my answer' })}>
        Submit Answer
      </button>
    </div>
  );
}

function Results() {
  const { state } = useGameState();

  return (
    <div>
      <h2>Results</h2>
      <p>Game over!</p>
    </div>
  );
}
```

---

---

## Common Gotchas

These cause silent failures with no helpful error message:

| Issue | Correct Usage |
|-------|---------------|
| `usePlayer()` key is `player`, not `currentPlayer` | `const { player } = usePlayer()` |
| `sendAction` takes two args, not an object | `sendAction('type', payload)` |
| `usePhase()` returns the value directly | `const phase = usePhase()` |
| `handleAction()` receives a single object; player is inside | `action.playerId` |
| `BonfireProvider` uses `config={{ url }}`, not `serverUrl` | `config={{ url: serverUrl }}` |
| `onGameStart()` does NOT auto-transition phases | call `transitionPhase()` yourself |
| `transitionPhase()` throws if phase not in `config.phases` | list ALL phases upfront in config |

---

## Vite Setup (Required)

When using Bonfire packages from a Vite app, add this to your `vite.config.ts` to avoid "does not provide an export named" errors:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['@bonfire/client', '@bonfire/core'],
  },
  build: {
    commonjsOptions: {
      include: [/@bonfire\//, /node_modules/],
    },
  },
});
```

---

## Related Documentation

- **Architecture:** `docs/architecture/client-library.md` - Detailed design and architecture
- **Server Package:** `packages/server/README.md` - Server API reference
- **Core Package:** `packages/core/README.md` - Game engine API
- **Milestones:** `docs/MILESTONES.md` - Development roadmap

---

## License

MIT
