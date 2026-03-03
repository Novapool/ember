# Architecture Documentation

This directory contains architectural documentation for the Ember framework.

## Available Documentation

- **core-classes.md** - Core class architecture (SocialGame, PlayerManager, EventEmitter, validators)
  - Read when: Understanding framework internals, contributing to core, debugging issues, making architectural decisions

- **server-infrastructure.md** - Server class architecture (RoomManager, SocketStateSynchronizer, database adapters, database schema)
  - Read when: Understanding server design, implementing Socket.io integration, working with database adapters, understanding Firebase/PostgreSQL schema, debugging server issues

- **client-library.md** - Client library architecture (EmberClient, EmberProvider, React hooks)
  - Read when: Understanding client hooks, building game UIs, working with state subscriptions, debugging client-server communication

## Future Documentation

As the project grows, additional architecture documentation will be added here:

- **state-machine.md** - Phase management and state transitions (when complex phase logic is added)
- **scalability.md** - Performance considerations and optimization strategies (post-MVP)
