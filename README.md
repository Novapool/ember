# Ember

An open-source TypeScript framework for building social party games — think "Rails for party games."

Ember handles the infrastructure so you can focus on game logic: WebSocket rooms, player state, reconnects, phase transitions, and a ready-made React component library are all included out of the box.

> **Note:** Ember is the framework. Bonfire is the party game platform built on top of it. Package scope stays `@bonfire/*` to match the platform org.

## What's in the box

**`@bonfire-ember/core`** — Base classes, types, and interfaces. Extend `SocialGame` and implement your game logic.

**`@bonfire-ember/server`** — Socket.io server, room management, and database adapters (Firebase + in-memory for testing).

**`@bonfire-ember/client`** — React hooks and a UI component library (Lobby, Timer, PlayerAvatar, PromptCard, ResponseInput, VotingInterface, RevealPhase, GameProgress).

## Quick look

```typescript
import { SocialGame, GameState, Player, PlayerAction, ActionResult } from '@bonfire-ember/core';

interface TriviaState extends GameState {
  scores: Record<string, number>;
  currentQuestion: string;
}

class TriviaGame extends SocialGame<TriviaState> {
  config = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['lobby', 'question', 'results'],
    disconnectTimeout: 30000,
  };

  async onGameStart(): Promise<void> {
    await this.transitionPhase('question');
  }

  async handleAction(action: PlayerAction): Promise<ActionResult> {
    // handle player answers
    return { success: true };
  }
}
```

On the client:

```tsx
import { EmberProvider, useGameState, usePlayer, Lobby } from '@bonfire-ember/client';

function App() {
  return (
    <EmberProvider config={{ url: 'http://localhost:3001' }}>
      <Game />
    </EmberProvider>
  );
}

function Game() {
  const { state } = useGameState();
  const { player } = usePlayer();
  // render based on state.phase
}
```

## Setup

```bash
# Clone and install
git clone <repo-url>
cd bonfire
npm install

# Build all packages
npm run build --workspaces

# Run tests
npm test --workspaces
```

The monorepo uses npm workspaces. Build order matters: `core` → `server` / `client`.

## Using Ember in a game project

Reference packages via local `file:` paths while in development:

```json
{
  "dependencies": {
    "@bonfire-ember/core": "file:../ember/packages/core",
    "@bonfire-ember/server": "file:../ember/packages/server",
    "@bonfire-ember/client": "file:../ember/packages/client"
  }
}
```

All three packages output ESM (`"type": "module"`). Vite handles them natively — no `optimizeDeps`, `commonjsOptions`, or named exports list required. A plain `vite.config.ts` is sufficient.

**Always rebuild Ember packages before running `npm install` in your game project.**

## Documentation

- `docs/PROJECT_OVERVIEW.md` — Architecture, philosophy, tech stack
- `docs/MILESTONES.md` — Development roadmap and progress
- `docs/architecture/` — Deep dives into core, server, and client internals
- `docs/api/FIREBASE.md` — Firebase setup (local emulator + production)
- `docs/api/ADMIN_API.md` — Admin REST endpoints
- `packages/core/README.md` — Core API reference
- `packages/server/README.md` — Server API reference
- `packages/client/README.md` — Client hooks and components reference

## Status

Milestones 1–7.5 are complete (core engine, server infrastructure, client library, UI components, Surface Level game, dual-use architecture, session/timer improvements). Milestone 8 (second game — validation) is next.
