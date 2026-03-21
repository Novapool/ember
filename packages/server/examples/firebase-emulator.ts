/**
 * Example: Running SocketServer with Firebase Emulator (Local Development)
 *
 * This example demonstrates local development using Firebase Emulator.
 * No Firebase account or credentials required!
 */

import { SocketServer, FirebaseAdapter } from '../src/index'
import { SocialGame } from '@bonfire-ember/core'

async function main() {
  console.log('🔥 Starting Bonfire server with Firebase Emulator...')
  console.log('📝 Make sure Firebase Emulator is running: firebase emulators:start --only database')

  // Create Firebase adapter configured for emulator
  const adapter = new FirebaseAdapter({
    projectId: 'bonfire-dev',
    databaseURL: 'http://localhost:9000?ns=bonfire-dev',
    useEmulator: true, // Connect to local emulator
  })

  // Initialize adapter
  await adapter.initialize()
  console.log('✅ Firebase Emulator adapter initialized')
  console.log('🌐 Emulator UI: http://localhost:4000')

  // Create server
  const server = new SocketServer({
    port: 3000,
    nodeEnv: 'development',
    databaseAdapter: adapter,
    gameFactory: () => new SocialGame(),
    room: {
      defaultTTL: 2 * 60 * 60 * 1000, // 2 hours (shorter for dev)
      maxRooms: 100,
      cleanupInterval: 15 * 60 * 1000, // 15 minutes (more frequent for dev)
    },
    admin: {
      enabled: true,
      apiKey: 'dev-key', // Simple key for local development
    },
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3001'],
      credentials: true,
    },
  })

  // Initialize and start server
  await server.initialize()
  await server.start()

  const stats = server.getStats()
  console.log(`
🚀 Development server running!

Server:     http://localhost:${stats.port}
Admin:      http://localhost:${stats.port}/admin/stats
Emulator:   http://localhost:4000
Rooms:      ${stats.roomCount}
Players:    ${stats.playerCount}

Example requests:
- Health check:  curl http://localhost:${stats.port}/health
- Server stats:  curl -H "x-api-key: dev-key" http://localhost:${stats.port}/admin/stats

Press Ctrl+C to stop
  `)

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...')
    await server.shutdown()
    await adapter.close()
    console.log('✅ Server stopped')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// Run server
main().catch((error) => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})
