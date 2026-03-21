#!/usr/bin/env node
/**
 * Bonfire — create-game scaffold
 *
 * Usage (from anywhere in the repo):
 *   node ember/scripts/create-game.mjs <game-name>
 *   npm run create-game --prefix ./ember -- <game-name>
 *
 * Creates: games/<game-name>/
 *   server/  — SocialGame subclass + SocketServer setup
 *   client/  — React app with BonfireProvider, GameRouter, screens
 *   docs/    — GAME_DESIGN.md + ARCHITECTURE.md stubs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';

// ─── Helpers ────────────────────────────────────────────────────────────────

// When run inside the monorepo (node ember/scripts/create-game.mjs),
// write to <cwd>/games/. When installed globally via npm (npx bonfire create-game),
// write to <cwd>/games/ — i.e. wherever the user ran the command.
const GAMES_ROOT = join(process.cwd(), 'games');

function toSnakeCase(s) {
  return s.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function toKebabCase(s) {
  return s.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function toPascalCase(s) {
  return s.trim()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toTitleCase(s) {
  return s.trim()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function write(filePath, content) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  const rel = relative(process.cwd(), filePath);
  console.log(`  created  ${rel}`);
}

// ─── Templates ───────────────────────────────────────────────────────────────

function serverPackageJson(kebab) {
  return JSON.stringify({
    name: `${kebab}-server`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      test: 'vitest run',
      'test:watch': 'vitest',
    },
    dependencies: {
      '@bonfire-ember/core': 'file:../../ember/packages/core',
      '@bonfire-ember/server': 'file:../../ember/packages/server',
      dotenv: '^17.0.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      tsx: '^4.0.0',
      typescript: '^5.0.0',
      vitest: '^2.0.0',
    },
  }, null, 2) + '\n';
}

function serverTsConfig() {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ES2020'],
      outDir: './dist',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
    },
    include: ['src/**/*'],
  }, null, 2) + '\n';
}

function serverEnvExample(port) {
  return `FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
PORT=${port}
CORS_ORIGIN=http://localhost:${port + 1000}
`;
}

function serverIndexTs(pascal, port) {
  return `import 'dotenv/config';
import { SocketServer, InMemoryAdapter } from '@bonfire-ember/server';
import { ${pascal}Game } from './game';

// For production, swap InMemoryAdapter with FirebaseAdapter
// See games/surface_level/server/src/index.ts for the Firebase setup
const adapter = new InMemoryAdapter();

const gameFactory = (roomId: string, synchronizer: any) =>
  new ${pascal}Game(roomId, synchronizer);

const server = new SocketServer(
  {
    port: Number(process.env.PORT) || ${port},
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
    room: {
      defaultTTL: 4 * 60 * 60 * 1000,
      maxRooms: 100,
    },
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:${port + 1000}'],
      credentials: true,
    },
  },
  adapter,
  gameFactory,
  '${pascal.toLowerCase()}'
);

await server.start();
console.log('${pascal} server running on port', process.env.PORT || ${port});
`;
}

function serverGameTs(pascal) {
  return `import { SocialGame, type GameConfig, type PlayerAction, type ActionResult, type Player } from '@bonfire-ember/core';
import type { ${pascal}State } from '../../client/src/types';

const INITIAL_STATE = (roomId: string): ${pascal}State => ({
  roomId,
  phase: 'lobby',
  players: [],
  playerOrder: [],
  // TODO: add your game-specific initial state here
});

export class ${pascal}Game extends SocialGame<${pascal}State> {
  config: GameConfig = {
    minPlayers: 2,
    maxPlayers: 10,
    // TODO: add all phases your game will ever enter
    phases: ['lobby', 'playing', 'finished'],
    disconnectStrategy: 'transfer-host',
    disconnectTimeout: 30_000,
  };

  constructor(roomId: string, synchronizer: any = null) {
    super(roomId, INITIAL_STATE(roomId), synchronizer);
  }

  async onPlayerJoin(_player: Player): Promise<void> {}

  async onPlayerLeave(_playerId: string): Promise<void> {
    // TODO: handle mid-game disconnects
    // If fewer than 2 players remain, consider transitioning to 'finished'
  }

  async onGameStart(): Promise<void> {
    const state = this.getState() as ${pascal}State;
    const playerOrder = state.players.map((p: Player) => p.id);
    await this.updateState({ playerOrder });
    await this.transitionPhase('playing'); // must call transitionPhase — Ember won't do it automatically
  }

  async onGameEnd(): Promise<void> {}
  async onPhaseChange(): Promise<void> {}

  async handleAction(action: PlayerAction): Promise<ActionResult> {
    const playerId = action.playerId;
    switch (action.type) {
      // TODO: add your game actions here
      // case 'my_action':
      //   return this.handleMyAction(playerId, action.payload as { ... });
      default:
        return { success: false, error: \`Unknown action: \${action.type}\` };
    }
  }
}
`;
}

function clientPackageJson(kebab) {
  return JSON.stringify({
    name: `${kebab}-client`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      '@bonfire-ember/client': 'file:../../ember/packages/client',
      '@bonfire-ember/core': 'file:../../ember/packages/core',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
    },
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.0.0',
      typescript: '^5.0.0',
      vite: '^6.0.0',
    },
  }, null, 2) + '\n';
}

function clientTsConfig() {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      noEmit: true,
    },
    include: ['src/**/*'],
  }, null, 2) + '\n';
}

function clientViteConfig(port) {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: ${port},
  },
});
`;
}

function clientIndexHtml(title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function clientMainTsx() {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './game.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function clientAppTsx(port) {
  return `import React from 'react';
import { BonfireProvider, BonfireErrorBoundary } from '@bonfire-ember/client';
import { GameRouter } from './GameRouter';

export function App() {
  return (
    <BonfireProvider config={{ url: import.meta.env.VITE_SERVER_URL || 'http://localhost:${port}' }}>
      <BonfireErrorBoundary
        fallback={(err, reset) => (
          <div style={{ padding: 32, textAlign: 'center', color: '#fff', fontFamily: 'system-ui' }}>
            <p>Something went wrong: {err.message}</p>
            <button onClick={reset} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}
      >
        <GameRouter />
      </BonfireErrorBoundary>
    </BonfireProvider>
  );
}
`;
}

function clientGameRouterTsx(pascal) {
  return `import React from 'react';
import { usePhase, useGameState, useSession } from '@bonfire-ember/client';
import type { ${pascal}State } from './types';
import { LandingScreen } from './screens/LandingScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { PlayingScreen } from './screens/PlayingScreen';
import { FinishedScreen } from './screens/FinishedScreen';

function ReconnectingOverlay() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111',
      color: 'rgba(255,255,255,0.5)',
      fontFamily: 'system-ui',
    }}>
      Reconnecting...
    </div>
  );
}

export function GameRouter() {
  const { isRestoring } = useSession();
  const phase = usePhase();
  const { state } = useGameState();

  if (isRestoring) return <ReconnectingOverlay />;
  if (!phase || !state) return <LandingScreen />;

  const gameState = state as ${pascal}State;

  if (phase === 'lobby')    return <LobbyScreen />;
  if (phase === 'playing')  return <PlayingScreen gameState={gameState} />;
  if (phase === 'finished') return <FinishedScreen gameState={gameState} />;

  return <LandingScreen />;
}
`;
}

function clientTypes(pascal) {
  return `import type { GameState } from '@bonfire-ember/core';

export interface ${pascal}State extends GameState {
  // NOTE: playerOrder is not in base GameState — declare it here if your game needs turn order
  playerOrder: string[];

  // TODO: add your game-specific state fields here
  // Example:
  // currentRound: number;
  // scores: Record<string, number>;
}
`;
}

function clientGameCss() {
  return `*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #111;
  color: #fff;
  -webkit-font-smoothing: antialiased;
}

@keyframes fadein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fadein {
  animation: fadein 0.25s ease forwards;
}
`;
}

function clientLandingScreenTsx() {
  return `import React, { useState } from 'react';
import { useRoom } from '@bonfire-ember/client';

export function LandingScreen() {
  const { createRoom, joinRoom } = useRoom();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'idle' | 'join'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    const result = await createRoom(name.trim());
    if (!result.success) setError(result.error ?? 'Failed to create room');
    setLoading(false);
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name');
    if (!code.trim()) return setError('Enter a room code');
    setLoading(true);
    setError('');
    const result = await joinRoom(code.trim().toUpperCase(), name.trim());
    if (!result.success) setError(result.error ?? 'Failed to join room');
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
          {/* TODO: replace with your game name and style */}
          Game
        </h1>

        <input
          style={inputStyle}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />

        {mode === 'join' && (
          <input
            style={inputStyle}
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        )}

        {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{error}</p>}

        {mode === 'idle' ? (
          <>
            <button style={btnStyle} onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)' }} onClick={() => setMode('join')}>
              Join Room
            </button>
          </>
        ) : (
          <>
            <button style={btnStyle} onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button style={{ ...btnStyle, background: 'transparent', color: 'rgba(255,255,255,0.4)' }} onClick={() => setMode('idle')}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 15,
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '13px 0',
  background: '#3b82f6',
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
};
`;
}

function clientLobbyScreenTsx() {
  return `import React from 'react';
import { usePlayer, useRoom } from '@bonfire-ember/client';

export function LobbyScreen() {
  const { player, isHost, players } = usePlayer();
  const { startGame } = useRoom();

  const roomId = (player as any)?.roomId ?? '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Lobby</h2>
          <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '0.15em' }}>
            {roomId}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p) => (
            <div key={p.id} style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{p.name}</span>
              {p.isHost && <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>HOST</span>}
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            style={{
              padding: '14px 0',
              background: players.length < 2 ? 'rgba(255,255,255,0.15)' : '#3b82f6',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: players.length < 2 ? 'not-allowed' : 'pointer',
            }}
            onClick={startGame}
            disabled={players.length < 2}
          >
            Start Game
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
            Waiting for host to start...
          </p>
        )}
      </div>
    </div>
  );
}
`;
}

function clientPlayingScreenTsx(pascal) {
  return `import React from 'react';
import type { ${pascal}State } from '../types';

interface Props {
  gameState: ${pascal}State;
}

export function PlayingScreen({ gameState }: Props) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        {/* TODO: implement your main game screen */}
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Game in progress — phase: {gameState.phase}</p>
      </div>
    </div>
  );
}
`;
}

function clientFinishedScreenTsx(pascal) {
  return `import React from 'react';
import type { ${pascal}State } from '../types';

interface Props {
  gameState: ${pascal}State;
}

export function FinishedScreen({ gameState: _ }: Props) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h2 style={{ fontSize: 28, fontWeight: 700 }}>Game Over</h2>
      {/* TODO: show results */}
      <button
        style={{ padding: '12px 28px', background: '#3b82f6', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        onClick={() => window.location.reload()}
      >
        Play Again
      </button>
    </div>
  );
}
`;
}

function gameDesignMd(title) {
  return `# Game Design — ${title}

## Concept

<!-- Describe the game in 1-3 sentences -->

## Core Mechanics

<!-- How does the game work? What are the key interactions? -->

## Game Phases

| Phase | Description |
|-------|-------------|
| \`lobby\` | Players join, host starts game |
| \`playing\` | <!-- Main game loop --> |
| \`finished\` | Game over, show results |

## State Model

\`\`\`typescript
interface ${title.replace(/\s+/g, '')}State extends GameState {
  playerOrder: string[];
  // ...
}
\`\`\`

## Player Actions

### \`my_action\`
\`\`\`typescript
sendAction('my_action', { /* payload */ });
\`\`\`
**Server behavior:** TODO

## Settings

| Setting | Default | Description |
|---------|---------|-------------|

## Players

| Setting | Value |
|---------|-------|
| Min players | 2 |
| Max players | 10 |
`;
}

function architectureMd(title, _snake) {
  return `# Architecture — ${title}

See \`games/surface_level/docs/ARCHITECTURE.md\` for the full framework reference.

## How This Game Uses Ember

\`\`\`
${title} (this game)
├── server/   ← @bonfire-ember/core + @bonfire-ember/server
└── client/   ← @bonfire-ember/client (React hooks)
\`\`\`

## Local Development

**Build Ember first:**
\`\`\`bash
cd ../../ember && npm run build
\`\`\`

**Run server:**
\`\`\`bash
cd server && npm install && npm run dev
\`\`\`

**Run client:**
\`\`\`bash
cd client && npm install && npm run dev
\`\`\`

## Package Dependencies

\`\`\`json
// server/package.json
"@bonfire-ember/core": "file:../../ember/packages/core"
"@bonfire-ember/server": "file:../../ember/packages/server"

// client/package.json
"@bonfire-ember/client": "file:../../ember/packages/client"
"@bonfire-ember/core": "file:../../ember/packages/core"
\`\`\`

## Notes

- See \`games/surface_level/docs/TO-REMEMBER.md\` for Ember API gotchas
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (!arg) {
  console.error('\nUsage: node ember/scripts/create-game.mjs <game-name>\n');
  console.error('Examples:');
  console.error('  node ember/scripts/create-game.mjs my_game');
  console.error('  node ember/scripts/create-game.mjs "word battle"\n');
  process.exit(1);
}

const snake = toSnakeCase(arg);
const kebab = toKebabCase(arg);
const pascal = toPascalCase(arg);
const title = toTitleCase(arg);

const gameDir = join(GAMES_ROOT, snake);

if (existsSync(gameDir)) {
  console.error(`\nError: games/${snake}/ already exists.\n`);
  process.exit(1);
}

// Pick a server port that doesn't conflict with surface_level (3001/5173)
// Subsequent games get +1 offset from a base. For now just suggest 3002.
const serverPort = 3002;
const clientPort = 5174;

console.log(`\nScaffolding "${title}" → games/${snake}/\n`);

// Server
write(join(gameDir, 'server/package.json'), serverPackageJson(kebab));
write(join(gameDir, 'server/tsconfig.json'), serverTsConfig());
write(join(gameDir, 'server/.env.example'), serverEnvExample(serverPort));
write(join(gameDir, 'server/src/index.ts'), serverIndexTs(pascal, serverPort));
write(join(gameDir, 'server/src/game.ts'), serverGameTs(pascal));

// Client
write(join(gameDir, 'client/package.json'), clientPackageJson(kebab));
write(join(gameDir, 'client/tsconfig.json'), clientTsConfig());
write(join(gameDir, 'client/vite.config.ts'), clientViteConfig(clientPort));
write(join(gameDir, 'client/index.html'), clientIndexHtml(title));
write(join(gameDir, 'client/src/main.tsx'), clientMainTsx());
write(join(gameDir, 'client/src/App.tsx'), clientAppTsx(serverPort));
write(join(gameDir, 'client/src/GameRouter.tsx'), clientGameRouterTsx(pascal));
write(join(gameDir, 'client/src/types.ts'), clientTypes(pascal));
write(join(gameDir, 'client/src/game.css'), clientGameCss());
write(join(gameDir, 'client/src/screens/LandingScreen.tsx'), clientLandingScreenTsx());
write(join(gameDir, 'client/src/screens/LobbyScreen.tsx'), clientLobbyScreenTsx());
write(join(gameDir, 'client/src/screens/PlayingScreen.tsx'), clientPlayingScreenTsx(pascal));
write(join(gameDir, 'client/src/screens/FinishedScreen.tsx'), clientFinishedScreenTsx(pascal));

// Docs
write(join(gameDir, 'docs/GAME_DESIGN.md'), gameDesignMd(title));
write(join(gameDir, 'docs/ARCHITECTURE.md'), architectureMd(title));

console.log(`
Done! Next steps:

  1. Build Ember (if not already built):
     cd ember && npm run build

  2. Install dependencies:
     cd games/${snake}/server && npm install
     cd games/${snake}/client && npm install

  3. Start developing:
     cd games/${snake}/server && npm run dev   # port ${serverPort}
     cd games/${snake}/client && npm run dev   # port ${clientPort}

  4. Edit your game logic:
     games/${snake}/server/src/game.ts   — extend SocialGame
     games/${snake}/client/src/types.ts  — define your state type
     games/${snake}/client/src/screens/  — build your UI screens

  Read docs/TO-REMEMBER.md in surface_level for Ember API gotchas.
`);
