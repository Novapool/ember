/**
 * Firebase Realtime Database adapter
 *
 * This adapter integrates with Firebase Realtime Database for production
 * persistence of game state and room metadata.
 */

import * as admin from 'firebase-admin'
import type { GameState, RoomId } from '@bonfire-ember/core'
import type { RoomMetadata } from '../types'
import type { IDatabaseAdapter } from './IDatabaseAdapter'

/**
 * Firebase adapter configuration
 */
export interface FirebaseAdapterConfig {
  /**
   * Firebase project ID
   */
  projectId: string

  /**
   * Firebase Realtime Database URL
   * Example: https://my-project.firebaseio.com
   */
  databaseURL: string

  /**
   * Path to service account credentials JSON file
   * Optional - if not provided, uses Application Default Credentials
   */
  credentialsPath?: string

  /**
   * Service account credentials object
   * Optional - alternative to credentialsPath
   */
  credentials?: admin.ServiceAccount

  /**
   * Whether to use Firebase emulator (for local development)
   * Set to true when FIREBASE_EMULATOR_HOST is set
   */
  useEmulator?: boolean
}

/**
 * Firebase Realtime Database adapter
 *
 * Database structure:
 * /rooms/{roomId}/state - Game state
 * /rooms/{roomId}/metadata - Room metadata
 */
export class FirebaseAdapter implements IDatabaseAdapter {
  private app: admin.app.App | null = null
  private db: admin.database.Database | null = null
  private config: FirebaseAdapterConfig

  constructor(config: FirebaseAdapterConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    // For emulator mode, set environment variable upfront
    if (this.config.useEmulator) {
      const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:9000'
      if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
        process.env.FIREBASE_DATABASE_EMULATOR_HOST = emulatorHost
      }
    }

    // Get or create Firebase app
    this.app = this.getOrCreateApp()
    this.db = this.app.database()
  }

  /**
   * Get existing Firebase app or create a new one
   */
  private getOrCreateApp(): admin.app.App {
    try {
      return admin.app('[DEFAULT]')
    } catch {
      return this.createApp()
    }
  }

  /**
   * Create and initialize a new Firebase app
   */
  private createApp(): admin.app.App {
    const appConfig: admin.AppOptions = {
      projectId: this.config.projectId,
      databaseURL: this.config.databaseURL,
    }

    // Add credentials based on configuration
    if (this.config.credentials) {
      appConfig.credential = admin.credential.cert(this.config.credentials)
    } else if (this.config.credentialsPath) {
      appConfig.credential = admin.credential.cert(this.config.credentialsPath)
    } else if (!this.config.useEmulator) {
      // Use Application Default Credentials for production
      appConfig.credential = admin.credential.applicationDefault()
    }
    // For emulator, no credential needed - handled via environment variable

    return admin.initializeApp(appConfig)
  }

  async saveGameState(roomId: RoomId, state: GameState): Promise<void> {
    this.ensureInitialized()
    const ref = this.db!.ref(`rooms/${roomId}/state`)
    await ref.set(state)
  }

  async loadGameState(roomId: RoomId): Promise<GameState | null> {
    this.ensureInitialized()
    const ref = this.db!.ref(`rooms/${roomId}/state`)
    const snapshot = await ref.once('value')
    const state = snapshot.val() as GameState | null

    // Firebase doesn't persist empty arrays, so we need to ensure players exists
    if (state && !state.players) {
      state.players = []
    }

    return state
  }

  async deleteRoom(roomId: RoomId): Promise<void> {
    this.ensureInitialized()
    const ref = this.db!.ref(`rooms/${roomId}`)
    await ref.remove()
  }

  async updateRoomMetadata(roomId: RoomId, metadata: RoomMetadata): Promise<void> {
    this.ensureInitialized()
    const ref = this.db!.ref(`rooms/${roomId}/metadata`)
    await ref.set(metadata)
  }

  async getRoomMetadata(roomId: RoomId): Promise<RoomMetadata | null> {
    this.ensureInitialized()
    const ref = this.db!.ref(`rooms/${roomId}/metadata`)
    const snapshot = await ref.once('value')
    return snapshot.val() as RoomMetadata | null
  }

  async getAllRoomMetadata(): Promise<RoomMetadata[]> {
    this.ensureInitialized()
    const ref = this.db!.ref('rooms')
    const snapshot = await ref.once('value')
    const rooms = snapshot.val()

    if (!rooms) {
      return []
    }

    const metadataList: RoomMetadata[] = []
    for (const roomId in rooms) {
      if (rooms[roomId]?.metadata) {
        metadataList.push(rooms[roomId].metadata as RoomMetadata)
      }
    }

    return metadataList
  }

  async getInactiveRooms(olderThan: number): Promise<RoomId[]> {
    this.ensureInitialized()
    const ref = this.db!.ref('rooms')

    // Query rooms with lastActivity older than threshold
    // Note: Firebase queries work on direct children, so we need to fetch and filter
    const snapshot = await ref.once('value')
    const rooms = snapshot.val()

    if (!rooms) {
      return []
    }

    const inactiveRooms: RoomId[] = []
    for (const roomId in rooms) {
      const metadata = rooms[roomId]?.metadata as RoomMetadata | undefined
      if (metadata && metadata.lastActivity < olderThan) {
        inactiveRooms.push(roomId as RoomId)
      }
    }

    return inactiveRooms
  }

  async roomExists(roomId: RoomId): Promise<boolean> {
    this.ensureInitialized()
    const ref = this.db!.ref(`rooms/${roomId}/state`)
    const snapshot = await ref.once('value')
    return snapshot.exists()
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.delete()
      this.app = null
      this.db = null
    }
  }

  /**
   * Ensure the adapter is initialized before use
   * @throws Error if not initialized
   */
  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('FirebaseAdapter not initialized. Call initialize() first.')
    }
  }

  /**
   * Get the underlying Firebase database instance (for advanced usage)
   */
  getDatabase(): admin.database.Database {
    this.ensureInitialized()
    return this.db!
  }
}
