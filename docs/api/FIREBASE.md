# Firebase Setup Guide

This guide covers setting up Firebase Realtime Database for Ember server infrastructure, including both local development (emulator) and production deployment.

---

## Quick Start

**Test your Firebase connection (production):**
```bash
cd packages/server
npm run firebase:test
```

**Start Firebase emulator (local development):**
```bash
cd packages/server
npm run firebase:emulator
```

**Run tests with emulator:**
```bash
cd packages/server
npm run test:firebase
```

---

## Overview

Bonfire uses Firebase Realtime Database for:
- **Game state persistence** - Store and retrieve game state
- **Room metadata** - Track room information and lifecycle
- **Automatic cleanup** - Query inactive rooms for TTL cleanup

**Database Structure:**
```
/rooms/
  /{roomId}/
    /state - Game state object
    /metadata - Room metadata (createdAt, lastActivity, etc.)
```

---

## Local Development (Firebase Emulator)

### Prerequisites

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Verify Installation:**
   ```bash
   firebase --version
   ```

### Setup Emulator

1. **Navigate to Server Package:**
   ```bash
   cd packages/server
   ```

2. **Start Firebase Emulator:**
   ```bash
   firebase emulators:start --only database
   ```

   This will start:
   - **Database Emulator:** `localhost:9000`
   - **Emulator UI:** `http://localhost:4000`

3. **Environment Variables:**
   Create `.env` file in `packages/server/`:
   ```env
   FIREBASE_EMULATOR_HOST=localhost:9000
   FIREBASE_PROJECT_ID=bonfire-dev
   FIREBASE_DATABASE_URL=http://localhost:9000?ns=bonfire-dev
   ```

4. **Use in Code:**
   ```typescript
   import { FirebaseAdapter } from '@bonfire-ember/server'

   const adapter = new FirebaseAdapter({
     projectId: process.env.FIREBASE_PROJECT_ID!,
     databaseURL: process.env.FIREBASE_DATABASE_URL!,
     useEmulator: true, // Connects to local emulator
   })

   await adapter.initialize()
   ```

### Emulator Features

- **No credentials required** - Works without Firebase account
- **UI dashboard** - View and edit data at `http://localhost:4000`
- **Fast reset** - Data clears on emulator restart
- **Perfect for testing** - Isolated from production

### Running Tests with Emulator

`test:firebase` uses `firebase emulators:exec` which **automatically starts the emulator, runs the tests, then shuts it down** — no separate terminal needed:

```bash
cd packages/server
npm run test:firebase
```

That's it. The emulator lifecycle is fully managed by the script.

**How it works:**
- `firebase emulators:exec` starts the database emulator
- Sets `FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000` in the child process environment
- Runs `vitest run __tests__/unit/database/FirebaseAdapter.test.ts`
- Stops the emulator when tests complete

**Normal `npm test` behavior:**
`FirebaseAdapter` tests are skipped automatically when the emulator isn't running (they show as `·` not `×`). Only `npm run test:firebase` runs them.

**Manual emulator option** (if you want the emulator running separately for development):
```bash
# Terminal 1: Keep emulator running
npm run firebase:emulator

# Terminal 2: Run Firebase tests (emulator already up, env var needed)
FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000 npm test
```

---

## Production Setup

### Step 1: Create Firebase Project

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com
   - Click "Add project"

2. **Configure Project:**
   - **Project name:** `bonfire-production` (or your choice)
   - **Google Analytics:** Optional (can disable for simpler setup)
   - Click "Create project"

3. **Enable Realtime Database:**
   - In Firebase Console, go to **Build** → **Realtime Database**
   - Click "Create Database"
   - Choose location (e.g., `us-central1`)
   - Start in **Test mode** (we'll add rules later)

4. **Note Database URL:**
   - You'll see a URL like: `https://bonfire-production-default-rtdb.firebaseio.com`
   - Save this - you'll need it for configuration

### Step 2: Generate Service Account Credentials

1. **Go to Project Settings:**
   - Click gear icon → **Project settings**
   - Navigate to **Service accounts** tab

2. **Generate Private Key:**
   - Click "Generate new private key"
   - Download JSON file (e.g., `bonfire-production-firebase-adminsdk.json`)
   - **IMPORTANT:** Keep this file secure - it grants full access to your Firebase project

3. **Store Credentials Securely:**
   ```bash
   # Create credentials directory (add to .gitignore!)
   mkdir -p packages/server/credentials

   # Move downloaded file
   mv ~/Downloads/bonfire-production-firebase-adminsdk.json \
      packages/server/credentials/firebase-service-account.json
   ```

4. **Add to .gitignore:**
   ```gitignore
   # Firebase credentials
   packages/server/credentials/
   *.json
   !firebase.json
   !database.rules.json
   ```

### Step 3: Configure Environment Variables

**Option A: Environment Variables (Recommended for deployment)**

```env
# .env (add to .gitignore!)
FIREBASE_PROJECT_ID=bonfire-production
FIREBASE_DATABASE_URL=https://bonfire-production-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=/path/to/credentials/firebase-service-account.json
```

**Option B: Service Account Object (For cloud platforms)**

Many cloud platforms (Heroku, Render, etc.) allow setting JSON as environment variable:

```env
FIREBASE_PROJECT_ID=bonfire-production
FIREBASE_DATABASE_URL=https://bonfire-production-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

### Step 4: Initialize in Code

**Using Credentials File:**
```typescript
import { FirebaseAdapter } from '@bonfire-ember/server'

const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH,
})

await adapter.initialize()
```

**Using Credentials Object:**
```typescript
import { FirebaseAdapter } from '@bonfire-ember/server'

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)

const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  credentials,
})

await adapter.initialize()
```

**Using Application Default Credentials (GCP only):**
```typescript
const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  // No credentials - uses ADC from environment
})
```

### Step 5: Set Security Rules

1. **Update Database Rules:**
   - Go to Firebase Console → **Realtime Database** → **Rules**

2. **For Production (Secure):**
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "rooms": {
         "$roomId": {
           ".read": "auth != null",
           ".write": "auth != null",
           "state": {
             ".validate": "newData.hasChildren()"
           },
           "metadata": {
             ".validate": "newData.hasChildren(['roomId', 'createdAt', 'lastActivity', 'hostId', 'playerCount', 'status', 'gameType'])"
           }
         }
       }
     }
   }
   ```

   **Note:** This requires server-side authentication. For game servers with admin SDK, you can use:

   ```json
   {
     "rules": {
       ".read": false,
       ".write": false,
       "rooms": {
         "$roomId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```

   This allows server (with admin SDK) full access while blocking direct client access.

3. **Publish Rules:**
   - Click "Publish" to apply changes

### Step 6: Test Your Connection

Verify your Firebase setup is working correctly:

```bash
cd packages/server
npm run firebase:test
```

This will:
- ✓ Verify your credentials are valid
- ✓ Create a test room in Firebase
- ✓ Read the room data back
- ✓ Delete the test room
- ✓ Confirm everything is working

**Expected output:**
```
🔥 Testing Firebase connection...
✓ FirebaseAdapter created
✓ Firebase initialized successfully
✓ Test room created: TEST01
✓ Test room state retrieved
✓ Test room metadata retrieved
✓ Test room deleted
🎉 Firebase connection test successful!
```

---

## Integration with SocketServer

```typescript
import { SocketServer, FirebaseAdapter } from '@bonfire-ember/server'
import { SocialGame } from '@bonfire-ember/core'

// Create Firebase adapter
const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH,
})

await adapter.initialize()

// Create server with Firebase adapter
const server = new SocketServer({
  port: 3000,
  databaseAdapter: adapter,
  gameFactory: () => new SocialGame(),
  room: {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxRooms: 1000,
    cleanupInterval: 60 * 60 * 1000, // 1 hour
  },
})

await server.initialize()
await server.start()

console.log('Server running with Firebase backend!')
```

---

## Environment-Specific Configuration

### Development (.env.development)
```env
FIREBASE_EMULATOR_HOST=localhost:9000
FIREBASE_PROJECT_ID=bonfire-dev
FIREBASE_DATABASE_URL=http://localhost:9000?ns=bonfire-dev
USE_FIREBASE_EMULATOR=true
```

### Production (.env.production)
```env
FIREBASE_PROJECT_ID=bonfire-production
FIREBASE_DATABASE_URL=https://bonfire-production-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=/app/credentials/firebase-service-account.json
USE_FIREBASE_EMULATOR=false
```

### Loading Environment-Specific Config

```typescript
import * as dotenv from 'dotenv'

// Load environment-specific config
dotenv.config({ path: `.env.${process.env.NODE_ENV}` })

const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH,
  useEmulator: process.env.USE_FIREBASE_EMULATOR === 'true',
})
```

---

## Deployment Platforms

### Heroku

1. **Set Config Vars:**
   ```bash
   heroku config:set FIREBASE_PROJECT_ID=bonfire-production
   heroku config:set FIREBASE_DATABASE_URL=https://...firebaseio.com
   heroku config:set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

2. **Use in Code:**
   ```typescript
   const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
   const adapter = new FirebaseAdapter({
     projectId: process.env.FIREBASE_PROJECT_ID!,
     databaseURL: process.env.FIREBASE_DATABASE_URL!,
     credentials,
   })
   ```

### Railway

1. **Add Variables in Dashboard:**
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_DATABASE_URL`
   - `FIREBASE_SERVICE_ACCOUNT` (paste JSON as string)

2. **Same code as Heroku** (Railway auto-loads environment variables)

### Render

1. **Add Environment Variables:**
   - Go to Dashboard → Environment
   - Add `FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`
   - For credentials file: Use Render's secret files feature

2. **Use Secret File:**
   ```typescript
   const adapter = new FirebaseAdapter({
     projectId: process.env.FIREBASE_PROJECT_ID!,
     databaseURL: process.env.FIREBASE_DATABASE_URL!,
     credentialsPath: '/etc/secrets/firebase-service-account.json',
   })
   ```

### Google Cloud Platform (GCP)

1. **Use Application Default Credentials:**
   - No need to set credentials explicitly
   - GCP automatically provides credentials to services

2. **Simplified Config:**
   ```typescript
   const adapter = new FirebaseAdapter({
     projectId: process.env.FIREBASE_PROJECT_ID!,
     databaseURL: process.env.FIREBASE_DATABASE_URL!,
     // Credentials automatically loaded from GCP environment
   })
   ```

---

## Monitoring & Maintenance

### Firebase Console

- **Usage Tab:** View read/write operations, storage usage
- **Data Tab:** Browse and edit data manually
- **Rules Tab:** Update security rules
- **Usage & Billing:** Monitor costs and set budget alerts

### Database Operations

**View All Rooms:**
```typescript
const allRooms = await adapter.getAllRoomMetadata()
console.log(`Active rooms: ${allRooms.length}`)
```

**Manual Cleanup:**
```typescript
const threshold = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
const inactiveRooms = await adapter.getInactiveRooms(threshold)

for (const roomId of inactiveRooms) {
  await adapter.deleteRoom(roomId)
}
console.log(`Cleaned up ${inactiveRooms.length} inactive rooms`)
```

### Cost Optimization

- **Free Tier:** 1GB storage, 10GB/month downloads
- **Spark Plan (Free):** Good for development and small-scale testing
- **Blaze Plan (Pay-as-you-go):** Required for production with usage
- **Optimization Tips:**
  - Implement TTL cleanup to remove old rooms
  - Use `.indexOn` rules for query performance
  - Monitor usage in Firebase Console

---

## Troubleshooting

### "Permission denied" Error

**Cause:** Database rules are blocking access

**Solution:** Update rules to allow server access (see Security Rules section)

### "Failed to initialize Firebase adapter"

**Causes:**
- Invalid credentials path
- Malformed service account JSON
- Network issues

**Solutions:**
- Verify `FIREBASE_CREDENTIALS_PATH` points to valid JSON file
- Check JSON syntax if using `FIREBASE_SERVICE_ACCOUNT` env var
- Ensure firewall allows outbound connections to Firebase

### Emulator Connection Issues

**Cause:** Emulator not running or wrong port

**Solution:**
```bash
# Check if emulator is running
lsof -i :9000

# Restart emulator
firebase emulators:start --only database
```

### "Database URL is required"

**Cause:** Missing `databaseURL` in config

**Solution:** Ensure `FIREBASE_DATABASE_URL` is set in environment variables

---

## Migration from InMemoryAdapter

**Before (InMemoryAdapter):**
```typescript
import { InMemoryAdapter } from '@bonfire-ember/server'

const adapter = new InMemoryAdapter()
await adapter.initialize()
```

**After (FirebaseAdapter):**
```typescript
import { FirebaseAdapter } from '@bonfire-ember/server'

const adapter = new FirebaseAdapter({
  projectId: process.env.FIREBASE_PROJECT_ID!,
  databaseURL: process.env.FIREBASE_DATABASE_URL!,
  credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH,
})
await adapter.initialize()
```

**No code changes required** - Both implement `IDatabaseAdapter` interface!

---

## Next Steps

- **Phase 5:** PostgreSQL adapter for Railway deployment
- **Phase 6:** Redis adapter for high-performance caching
- **Advanced:** Multi-region Firebase setup for global deployment

---

## Common Commands Reference

All commands should be run from `packages/server/` directory:

```bash
cd packages/server
```

### Testing & Development

```bash
# Test Firebase connection (production)
npm run firebase:test

# Start Firebase emulator (local development)
npm run firebase:emulator

# Run unit tests with emulator
npm run test:firebase

# Run all tests
npm test
```

### Deployment

```bash
# Deploy database security rules to production
firebase deploy --only database

# Build TypeScript
npm run build
```

### Firebase CLI

```bash
# Login to Firebase
firebase login

# List your projects
firebase projects:list

# Switch active project
firebase use <project-id>

# Open Firebase console
firebase open
```

---

## Related Documentation

- **Server Infrastructure:** `docs/architecture/server-infrastructure.md`
- **Admin API:** `docs/api/ADMIN_API.md`
- **Deployment Guide:** Coming soon in Phase 5
