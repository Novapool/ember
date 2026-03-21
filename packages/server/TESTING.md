# Testing Guide - @bonfire-ember/server

This guide explains how to run tests for the server package, including Firebase Emulator setup.

---

## Quick Start

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Run Unit Tests (Non-Firebase)

```bash
npm test
```

This will run all tests that don't require Firebase emulator (InMemoryAdapter, RoomManager, etc.).

### 3. Run Firebase Tests

**Terminal 1: Start Firebase Emulator**
```bash
cd packages/server
firebase emulators:start --only database
```

**Terminal 2: Run Tests**
```bash
cd packages/server
npm test FirebaseAdapter.test.ts
```

Or run all tests with emulator running:
```bash
npm test
```

---

## Firebase Emulator Setup

### What is Firebase Emulator?

The Firebase Emulator lets you test Firebase integration **locally** without:
- Creating a Firebase project
- Using Firebase credentials
- Making network requests to Firebase servers
- Worrying about test data affecting production

### Emulator Features

- **Database at:** `localhost:9000`
- **Emulator UI at:** `http://localhost:4000`
- **Zero setup** - no Firebase account needed
- **Fast** - all data in memory
- **Isolated** - perfect for testing

### Starting the Emulator

```bash
# From packages/server directory
firebase emulators:start --only database
```

You should see:
```
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
│ i  View Emulator UI at http://localhost:4000                │
└─────────────────────────────────────────────────────────────┘

┌────────────────┬────────────────┬─────────────────────────────────┐
│ Emulator       │ Host:Port      │ View in Emulator UI             │
├────────────────┼────────────────┼─────────────────────────────────┤
│ Database       │ localhost:9000 │ http://localhost:4000/database  │
└────────────────┴────────────────┴─────────────────────────────────┘
```

### Viewing Test Data

While tests are running, visit `http://localhost:4000` to see:
- Real-time database structure
- Test data being created/modified
- Room state and metadata

---

## Test Organization

### Unit Tests (`__tests__/unit/`)

**Database Adapters:**
- `InMemoryAdapter.test.ts` - In-memory adapter (no emulator needed)
- `FirebaseAdapter.test.ts` - Firebase adapter (requires emulator)

**Core Components:**
- `RoomManager.test.ts` - Multi-room orchestration
- `SocketStateSynchronizer.test.ts` - State broadcasting

**Utilities:**
- `roomCodeGenerator.test.ts` - Room code generation
- `errors.test.ts` - Custom error classes

### Integration Tests (`__tests__/integration/`)

- `socketServer.test.ts` - Full server lifecycle
- `roomLifecycle.test.ts` - Room creation/deletion
- `playerManagement.test.ts` - Player join/leave
- `gameActions.test.ts` - Game action handling
- `adminEndpoints.test.ts` - Admin REST endpoints

---

## Running Specific Tests

### Run single test file
```bash
npm test FirebaseAdapter.test.ts
```

### Run all database tests
```bash
npm test database
```

### Run integration tests
```bash
npm test integration
```

### Watch mode (re-run on changes)
```bash
npm test -- --watch
```

### Coverage report
```bash
npm run test:coverage
```

---

## Troubleshooting

### "Cannot call useEmulator() after instance has already been initialized"

**Cause:** Firebase app was initialized without emulator, then tried to connect to emulator.

**Solution:**
1. Make sure emulator is running BEFORE running tests
2. Ensure `FIREBASE_EMULATOR_HOST=localhost:9000` is set
3. Clear any existing Firebase app instances

### "Connection refused" or "ECONNREFUSED"

**Cause:** Firebase emulator is not running.

**Solution:**
1. Start emulator: `firebase emulators:start --only database`
2. Verify it's running at `localhost:9000`
3. Check emulator UI at `http://localhost:4000`

### "Empty players array missing"

**Cause:** Firebase doesn't persist empty arrays/objects.

**Solution:** This is handled automatically in `FirebaseAdapter.loadGameState()` - it reconstructs empty arrays.

### Tests hang or timeout

**Cause:** Emulator not running or connection issues.

**Solution:**
1. Check emulator is running
2. Restart emulator if needed
3. Clear emulator data: Stop and restart emulator

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Run tests with Firebase Emulator
        run: |
          cd packages/server
          firebase emulators:exec --only database 'npm test'
```

### Using `emulators:exec`

Run tests automatically with emulator:

```bash
firebase emulators:exec --only database 'npm test'
```

This:
1. Starts emulator
2. Runs tests
3. Stops emulator
4. All in one command!

---

## Test Data Cleanup

### Automatic Cleanup

The tests use `beforeEach` to clear all data before each test:

```typescript
beforeEach(async () => {
  const db = adapter.getDatabase()
  await db.ref('rooms').remove()
})
```

### Manual Cleanup

Clear all emulator data:

```bash
# Stop emulator (Ctrl+C)
# Restart emulator
firebase emulators:start --only database
```

Data is automatically cleared when emulator restarts.

---

## Performance

### Test Execution Times

With emulator running:
- **FirebaseAdapter tests:** ~100-200ms (22 tests)
- **All unit tests:** ~500ms (97 tests)
- **Integration tests:** ~2-3s (41 tests)
- **Full test suite:** ~3-4s (138+ tests)

### Optimization Tips

1. **Keep emulator running** - Don't restart between test runs
2. **Use watch mode** - Only re-runs changed tests
3. **Run specific files** - Test only what you're working on
4. **Parallel tests** - Vitest runs tests in parallel by default

---

## Development Workflow

### Typical Workflow

```bash
# Terminal 1: Start emulator (leave running)
firebase emulators:start --only database

# Terminal 2: Watch mode
npm test -- --watch

# Make changes to code
# Tests auto-rerun on save
```

### Before Committing

```bash
# Run full test suite
npm test

# Check coverage
npm run test:coverage

# Build to verify TypeScript
npm run build
```

---

## Next Steps

- See `docs/api/FIREBASE.md` for production Firebase setup
- See `examples/firebase-emulator.ts` for emulator usage example
- See `examples/firebase-server.ts` for production server example
