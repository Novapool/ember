/**
 * Example: Running SocketServer with FirebaseAdapter
 *
 * This example demonstrates how to set up a production-ready server
 * using Firebase Realtime Database for persistence.
 */

import { SocketServer, FirebaseAdapter } from '../src/index'
import { SocialGame } from '@bonfire-ember/core'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function main() {
  console.log('🔥 Starting Bonfire server with Firebase...')

  // Create Firebase adapter
  const adapter = new FirebaseAdapter({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    databaseURL: process.env.FIREBASE_DATABASE_URL!,
    credentialsPath: process.env.FIREBASE_CREDENTIALS_PATH,
    useEmulator: process.env.USE_FIREBASE_EMULATOR === 'true',
  })

  // Initialize adapter
  await adapter.initialize()
  console.log('✅ Firebase adapter initialized')

  // Create server
  const server = new SocketServer({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    databaseAdapter: adapter,
    gameFactory: () => new SocialGame(),
    room: {
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxRooms: 1000,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
    },
    admin: {
      enabled: true,
      apiKey: process.env.ADMIN_API_KEY || 'dev-key-change-in-production',
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true,
    },
  })

  // Initialize server
  await server.initialize()
  console.log('✅ Server initialized')

  // Start server
  await server.start()

  const stats = server.getStats()
  console.log(`
🚀 Bonfire server running!

Server: http://localhost:${stats.port}
Admin:  http://localhost:${stats.port}/admin/stats
Uptime: ${new Date(stats.uptime).toISOString()}

Press Ctrl+C to stop
  `)

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...')
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
