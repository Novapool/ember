# Local Development Setup — Ember

How to get from a fresh clone to a running local environment.

## Prerequisites

- Node.js 18+
- npm
- Firebase CLI (`npm install -g firebase-tools`) — required for server integration tests

---

## 1. Clone and install

```bash
git clone <repo-url>
cd ember
npm install   # installs all workspace packages
```

## 2. Build packages (order matters)

The packages depend on each other: `core` must build first.

```bash
npm run build --workspaces
# or build individually:
cd packages/core && npm run build
cd ../server && npm run build
cd ../client && npm run build
```

Always rebuild before running `npm install` in a game project that references these via `file:` paths.

---

## 3. Run tests

Each package has its own test suite:

```bash
# All packages
npm test --workspaces

# Individual packages
cd packages/core && npm test
cd packages/server && npm test
cd packages/client && npm test
```

**Server integration tests require the Firebase emulator** (see section 4). They are skipped automatically if `FIREBASE_*` env vars are absent and the emulator is not running.

---

## 4. Firebase emulator (for server tests)

The server package uses Firebase Realtime Database. For local tests, use the emulator:

```bash
# From the ember/ root:
firebase login
firebase init emulators   # select Realtime Database; default port 9000
firebase emulators:start
```

With the emulator running, server integration tests (`packages/server/__tests__/`) will run against it automatically. No Firebase account or credentials needed.

For full Firebase setup (production credentials, service account), see `docs/api/FIREBASE.md`.

---

## 5. Storybook (client component playground)

```bash
cd packages/client && npm run storybook
```

Opens at http://localhost:6006. All 8 UI components have stories.

---

## 6. Using Ember in a game project

Reference packages via local `file:` paths:

```json
{
  "dependencies": {
    "@bonfire-ember/core": "file:../ember/packages/core",
    "@bonfire-ember/server": "file:../ember/packages/server",
    "@bonfire-ember/client": "file:../ember/packages/client"
  }
}
```

Always rebuild Ember (`npm run build --workspaces` from `ember/`) before running `npm install` in the game project.

If using Vite, add CJS interop config — see `README.md` for the `vite.config.ts` snippet.

---

## 7. Published packages

`@bonfire-ember/core` and `@bonfire-ember/server` are published to npm. To use published versions instead of local paths:

```json
{
  "dependencies": {
    "@bonfire-ember/core": "npm:@bonfire-ember/core@0.1.1",
    "@bonfire-ember/server": "npm:@bonfire-ember/server@0.1.1"
  }
}
```

`@bonfire-ember/client` is also published at `0.1.0` and can be referenced directly.
