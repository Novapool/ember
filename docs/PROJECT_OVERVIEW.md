# Ember

## Project Vision

An open-source framework for building social party games focused on relationship-building and meaningful connection. Think "Rails for party games" - providing the infrastructure and abstractions needed to rapidly build games like Jackbox, but specifically optimized for turn-based social mechanics, progressive disclosure, and depth-building interactions.

> **Naming:** Ember is the framework. Bonfire is the party game platform built on top of it. npm packages are scoped as `@bonfire/*`.

## The Problem

Currently, building multiplayer party games requires:
- Reinventing WebSocket/realtime infrastructure for every game
- Custom UI implementations for common patterns (lobbies, voting, reveals)
- Manual handling of player state, disconnections, and room management
- No standardized way to handle social game mechanics (turns, voting, reflection phases)

Existing frameworks (Colyseus, Phaser) are built for action games, not social/party games with relationship-building mechanics.

## The Solution

A comprehensive framework that provides:

**For Developers:**
- Plug-and-play infrastructure (no WebSocket boilerplate)
- Reusable UI components (lobbies, prompts, timers, reveals)
- Built-in patterns (turn-based, voting, simultaneous submission)
- Game plugin system for rapid prototyping

**For End Users:**
- Free, open-source alternative to Jackbox
- Games designed for meaningful connection, not just entertainment
- Community-driven content and game library

## Core Philosophy

1. **Convention over Configuration** - Sensible defaults, escape hatches when needed
2. **Progressive Disclosure** - Start simple, add complexity as you grow
3. **Developer Experience First** - Should feel magical to use, not tedious
4. **Abstraction at the Right Level** - Hide networking complexity, expose game logic

## Tech Stack

### Framework Core
- **TypeScript** - Type safety and excellent DX through autocomplete
- **Monorepo Structure** - All packages versioned together (npm workspaces or Turborepo)
- **Socket.io** - Battle-tested realtime communication
- **React** - Industry standard, massive ecosystem

### Backend Options
- **Phase 1 (MVP):** Firebase Realtime Database - Fast prototyping, generous free tier
- **Phase 2 (Scale):** Railway + Socket.io + Redis/PostgreSQL - Full control, hard cost caps

### Distribution
- **NPM Packages** - `@bonfire-ember/core`, `/server`, `/client`
- **CLI Tool** - `npx create-ember-game my-game` for instant scaffolding
- **Documentation Site** - Docusaurus or VitePress for guides and API reference

## Key Features

### For Framework Users (Game Developers)

**Minimal Game Implementation:**
```javascript
import { SocialGame } from '@bonfire-ember/core';

export default class MyGame extends SocialGame {
  config = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['submit', 'vote', 'reveal']
  };
  
  async onSubmitPhase(player, submission) {
    // Only write game-specific logic
    return { answer: submission.text };
  }
}
```

**Built-in Patterns:**
- Phase-based state machines (setup → play → reveal → next)
- Player turn management (round-robin, simultaneous, async)
- Voting systems (majority, ranked choice, weighted)
- Timer mechanics with pause/resume
- Disconnection handling with graceful recovery

**UI Component Library:**
- `<Lobby>` - Room codes, player lists, ready states
- `<PlayerAvatar>` - Deterministic color avatars with status and host crown
- `<Timer>` - Countdown with visual feedback
- `<PromptCard>` - Themed question displays
- `<ResponseInput>` - Text, multiple choice, ranking
- `<RevealPhase>` - Animated answer reveals
- `<GameProgress>` - Progress bar/dots/number variants
- `<VotingInterface>` - Voting UI with results and percentages

### For End Users (Players)

- Free access to growing library of games
- Mobile-friendly (phone as controller)
- No accounts required (join with room codes)
- Privacy-first (no data collection, optional local hosting)

## Architecture Overview

```
Framework Structure:
┌─────────────────────────────────────┐
│   @bonfire-ember/core                     │
│   - Base game classes                │
│   - State management abstractions    │
│   - Type definitions                 │
└─────────────────────────────────────┘
           ↓                 ↓
┌──────────────────┐  ┌──────────────────┐
│  /server         │  │  /client         │
│  - Socket.io     │  │  - React hooks   │
│  - Room mgmt     │  │  - UI components │
│  - DB adapter    │  │  - State sync    │
└──────────────────┘  └──────────────────┘
           ↓
┌─────────────────────────────────────┐
│   create-ember-game (CLI)           │
│   - Project scaffolding             │
│   - Template generation             │
└─────────────────────────────────────┘
```

## Development Approach

**Build Games to Build the Framework:**

1. Build first game (Surface Level) while extracting generic parts
2. Build second game to validate abstractions
3. Build third game to prove framework maturity
4. Open-source and invite contributors

Each game reveals what should be abstracted vs. game-specific.

## Success Metrics

**Short-term:**
- Framework can build 3+ games with 80% code reuse
- New games can be prototyped in <1 day
- External developer can scaffold game in <5 minutes

**Long-term:**
- 10+ community-contributed games
- 100+ GitHub stars
- Used in educational/therapeutic contexts
- Portfolio piece demonstrating systems design thinking

## Why This Matters

**Technically:**
- Demonstrates architecture and abstraction skills
- Shows ability to design developer-facing APIs
- Real-world TypeScript and distributed systems experience

**Practically:**
- Enables non-technical creators to build social games
- Provides free alternative to paid party game platforms
- Creates reusable infrastructure for future projects

**Personally:**
- Platform, not just a product (more impressive)
- Open-source portfolio piece
- Solves real problem in underserved niche
