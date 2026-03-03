# Ember Dual-Use UI Guide

Ember supports three distinct usage patterns for building game UIs. Pick the one that fits your needs — they compose cleanly, and you can mix patterns within a single game.

---

## Pattern 1: Drop-in default components

The fastest path. Import a pre-built component, drop it in, and you're done. Zero configuration required.

```tsx
import { Lobby, PromptCard, VotingInterface } from '@bonfire/client';

// Lobby screen — reads room state automatically via BonfireProvider
function LobbyScreen() {
  return <Lobby />;
}

// Question screen
function QuestionScreen() {
  return (
    <PromptCard
      prompt="What's the most embarrassing thing you've ever done?"
      variant="spicy"
      round={2}
      totalRounds={5}
    />
  );
}

// Voting screen
function VoteScreen() {
  const { state } = useGameState<MyGameState>();
  return (
    <VotingInterface
      options={state.answers.map((a) => ({ id: a.playerId, label: a.text }))}
      onVote={(id) => sendAction('vote', { targetId: id })}
    />
  );
}
```

**When to use:** Prototyping, internal tools, or when you're happy with Bonfire's visual style.

### Customising inner elements with `styles`

Every component with meaningful inner elements accepts a `styles` prop — an object of `React.CSSProperties` keyed by element name. This lets you restyle specific parts without touching the component's logic.

```tsx
<PromptCard
  prompt="Who knows you best?"
  styles={{
    promptText: { fontFamily: 'Georgia, serif', fontSize: '1.5rem' },
    badge:      { backgroundColor: '#4f46e5', color: '#fff' },
    subtitle:   { color: '#6b7280' },
  }}
/>

<Lobby
  styles={{
    roomCode:    { color: '#7c3aed', fontFamily: 'monospace' },
    playerRow:   { borderRadius: '12px' },
    hostBadge:   { backgroundColor: '#fde68a' },
    startButton: { borderRadius: '9999px' },
    waitingText: { fontStyle: 'italic' },
  }}
/>

<PlayerAvatar
  name="Alice"
  styles={{
    statusDot:  { backgroundColor: '#10b981' },
    crownBadge: { backgroundColor: '#f59e0b' },
  }}
/>

<Timer
  duration={30}
  styles={{
    ring:     { opacity: 0.8 },
    timeText: { fontFamily: 'monospace', letterSpacing: '-0.05em' },
  }}
/>

<VotingInterface
  options={options}
  styles={{
    option:      { borderRadius: '12px', padding: '1.25rem' },
    voteBar:     { marginTop: '0.75rem' },
    winnerBadge: { fontSize: '1.25rem' },
  }}
/>
```

**Rule of thumb:** Use `style` for root-level overrides (max-width, margin, background). Use `styles` for inner elements (text colour, badge style, button shape).

---

## Pattern 2: Headless hooks + custom UI

You want Bonfire's component logic (state management, validation, handlers) but you supply the markup and styles entirely.

```tsx
import { useLobby, useResponseInput } from '@bonfire/client';

// Custom lobby using useLobby() for all state + handlers
function MyCustomLobby() {
  const {
    roomCode,
    players,
    isHost,
    playerId,
    minPlayers,
    maxPlayers,
    canStart,
    isStarting,
    copied,
    handleCopyCode,
    handleStart,
  } = useLobby();

  return (
    <section className="lobby">
      <h1>Room: <button onClick={handleCopyCode}>{roomCode}</button></h1>
      {copied && <span>Copied!</span>}

      <p>{players.length} / {maxPlayers} players</p>

      <ul>
        {players.map((p) => (
          <li key={p.id} className={p.id === playerId ? 'me' : ''}>
            {p.name} {p.isHost && '👑'}
          </li>
        ))}
      </ul>

      {isHost && (
        <button
          onClick={handleStart}
          disabled={!canStart || isStarting}
        >
          {isStarting ? 'Starting…' : `Start (need ${minPlayers}+)`}
        </button>
      )}

      {!isHost && <p>Waiting for host…</p>}
    </section>
  );
}

// Custom answer input using useResponseInput()
function MyAnswerInput() {
  const { value, canSubmit, handleChange, handleSubmit, reset } = useResponseInput({
    config: { type: 'text', placeholder: 'Your answer…', maxLength: 200 },
    onSubmit: (v) => sendAction('submit_answer', { text: v }),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input
        value={value as string}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Your answer…"
        maxLength={200}
      />
      <span>{(value as string).length} / 200</span>
      <button type="submit" disabled={!canSubmit}>Submit</button>
      <button type="button" onClick={reset}>Clear</button>
    </form>
  );
}

// Ranking mode with full custom UI
function MyRankingInput({ items }: { items: { id: string; label: string }[] }) {
  const { value, rankingOps } = useResponseInput({
    config: { type: 'ranking', items },
    onSubmit: (v) => sendAction('submit_ranking', { order: v }),
  });

  const ranked = (value as string[]).map((id) => items.find((i) => i.id === id)!).filter(Boolean);

  return (
    <ol>
      {ranked.map((item, i) => (
        <li key={item.id}>
          <span>{i + 1}. {item.label}</span>
          <button onClick={() => rankingOps.moveUp(i)} disabled={i === 0}>↑</button>
          <button onClick={() => rankingOps.moveDown(i)} disabled={i === ranked.length - 1}>↓</button>
          <button onClick={() => rankingOps.remove(item.id)}>×</button>
        </li>
      ))}
    </ol>
  );
}
```

**When to use:** When you have a design system or specific brand requirements, but don't want to reimplement clipboard logic, start-game validation, ranking reordering, etc.

### Available headless hooks

| Hook | Replaces | Returns |
|------|----------|---------|
| `useLobby(options?)` | `<Lobby>` logic | `roomCode`, `players`, `isHost`, `playerId`, `minPlayers`, `maxPlayers`, `canStart`, `isStarting`, `copied`, `handleCopyCode`, `handleStart` |
| `useResponseInput({ config, ...})` | `<ResponseInput>` logic | `value`, `canSubmit`, `disabled`, `handleChange`, `handleSubmit`, `reset`, `rankingOps` |

---

## Pattern 3: Hooks only — build everything yourself

Use the 7 game-state hooks and write all UI from scratch. This is what LOIV2 uses.

```tsx
import {
  useGameState,
  usePlayer,
  useRoom,
  usePhase,
  useTurn,
  useConnection,
  useBonfireEvent,
} from '@bonfire/client';

function GameRoot() {
  const phase = usePhase();
  if (phase === 'lobby')    return <MyLobby />;
  if (phase === 'question') return <MyQuestion />;
  if (phase === 'results')  return <MyResults />;
  return null;
}

function MyQuestion() {
  const { state } = useGameState<MyGameState>();
  const { player, isHost } = usePlayer();
  const { sendAction } = useRoom();
  const { isMyTurn, currentPlayer } = useTurn();

  useBonfireEvent('question_revealed', (data) => {
    playSound('ding');
  });

  const submit = (answer: string) => sendAction('submit_answer', { answer });

  return (
    <div>
      <h2>{state?.currentQuestion}</h2>
      {isMyTurn ? (
        <input onKeyDown={(e) => e.key === 'Enter' && submit(e.currentTarget.value)} />
      ) : (
        <p>Waiting for {currentPlayer?.name}…</p>
      )}
    </div>
  );
}
```

**When to use:** When the game UI is so unique that even headless hooks don't help, or when you want full control over every interaction and animation.

### Game-state hooks reference

| Hook | Returns |
|------|---------|
| `useGameState<TState>()` | `{ state: TState \| null, requestState }` |
| `usePlayer()` | `{ player, playerId, isHost, players }` |
| `useRoom()` | `{ roomId, isInRoom, createRoom, joinRoom, leaveRoom, startGame, sendAction, reconnectToRoom }` |
| `usePhase()` | current phase string |
| `useTurn()` | `{ isMyTurn, currentPlayerId, currentPlayer, turnIndex }` |
| `useConnection()` | `{ status, connect, disconnect }` |
| `useBonfireEvent(type, handler)` | — (subscribes to custom game events) |

---

## Choosing a pattern

```
Does Bonfire's default visual style work for you?
  ├── Yes → Pattern 1 (default components) + styles prop if you need tweaks
  └── No  →
        Do you want to reuse component logic (lobby validation, ranking ops)?
          ├── Yes → Pattern 2 (headless hooks + custom UI)
          └── No  → Pattern 3 (hooks only — build everything from scratch)
```

Patterns compose: use `<Lobby>` for onboarding, `useResponseInput` for a custom answer UI, and raw `useGameState` for a completely bespoke results screen — all in the same game.

---

## Side-by-side lobby example

```tsx
// Pattern 1 — zero code
<Lobby />

// Pattern 2 — custom UI, Bonfire logic
function LobbyHeadless() {
  const { roomCode, players, canStart, handleCopyCode, handleStart } = useLobby();
  return (
    <div>
      <code onClick={handleCopyCode}>{roomCode}</code>
      <ul>{players.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      {canStart && <button onClick={handleStart}>Go!</button>}
    </div>
  );
}

// Pattern 3 — everything manual
function LobbyManual() {
  const { state } = useGameState();
  const { isHost, playerId } = usePlayer();
  const { startGame } = useRoom();
  const [starting, setStarting] = useState(false);

  const roomCode = (state?.metadata?.roomCode as string) || state?.roomId || '';
  const players = state?.players || [];
  const minPlayers = (state?.metadata?.config as any)?.minPlayers ?? 2;

  const start = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  return (
    <div>
      <code>{roomCode}</code>
      <ul>{players.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      {isHost && players.length >= minPlayers && (
        <button onClick={start} disabled={starting}>
          {starting ? 'Starting…' : 'Start'}
        </button>
      )}
    </div>
  );
}
```
