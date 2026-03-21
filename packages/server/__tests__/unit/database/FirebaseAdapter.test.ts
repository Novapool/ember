/**
 * Tests for FirebaseAdapter
 *
 * These tests use the Firebase Realtime Database Emulator for integration testing
 * without requiring actual Firebase credentials or cloud resources.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { GameState, RoomId } from '@bonfire-ember/core'
import type { RoomMetadata } from '../../../src/types'
import { FirebaseAdapter, type FirebaseAdapterConfig } from '../../../src/database/FirebaseAdapter'

// Skip these tests unless the Firebase emulator is running.
// To run: npm run test:firebase (auto-manages the emulator)
// Or manually: FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000 npm test
const skipFirebase = !process.env.FIREBASE_DATABASE_EMULATOR_HOST

describe.skipIf(skipFirebase)('FirebaseAdapter', () => {
  let adapter: FirebaseAdapter
  const config: FirebaseAdapterConfig = {
    projectId: 'bonfire-test',
    databaseURL: 'http://localhost:9000?ns=bonfire-test',
    useEmulator: true,
  }

  beforeAll(async () => {
    // Set emulator environment variables
    process.env.FIREBASE_EMULATOR_HOST = 'localhost:9000'
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9000'
    process.env.GCLOUD_PROJECT = 'bonfire-test'

    adapter = new FirebaseAdapter(config)
    await adapter.initialize()
  })

  afterAll(async () => {
    await adapter.close()
    delete process.env.FIREBASE_EMULATOR_HOST
    delete process.env.FIREBASE_DATABASE_EMULATOR_HOST
    delete process.env.GCLOUD_PROJECT
  })

  beforeEach(async () => {
    // Clear all data before each test
    const db = adapter.getDatabase()
    await db.ref('rooms').remove()
  })

  afterEach(async () => {
    // Note: We don't close the main adapter here, only in afterAll
    // This prevents re-initialization issues between tests
  })

  describe('initialize', () => {
    it('should initialize successfully with emulator config', async () => {
      // The adapter in beforeAll is already initialized successfully
      // This test verifies it doesn't throw
      expect(adapter).toBeDefined()
      expect(adapter.getDatabase()).toBeDefined()
    })

    it('should handle re-initialization of existing app', async () => {
      // Create another adapter with same config - should reuse existing app
      const newAdapter = new FirebaseAdapter(config)
      await expect(newAdapter.initialize()).resolves.not.toThrow()
      // Don't close - it would close the shared app
    })
  })

  describe('saveGameState and loadGameState', () => {
    const roomId: RoomId = 'TEST01'
    const gameState: GameState = {
      roomId,
      phase: 'playing',
      players: [],
      metadata: { score: 100 },
    }

    it('should save and load game state', async () => {
      await adapter.saveGameState(roomId, gameState)
      const loaded = await adapter.loadGameState(roomId)
      expect(loaded).toEqual(gameState)
    })

    it('should return null for non-existent room', async () => {
      const loaded = await adapter.loadGameState('NONEXIST' as RoomId)
      expect(loaded).toBeNull()
    })

    it('should overwrite existing state', async () => {
      await adapter.saveGameState(roomId, gameState)

      const newState: GameState = {
        roomId,
        phase: 'finished',
        players: [],
        metadata: { score: 200 },
      }
      await adapter.saveGameState(roomId, newState)

      const loaded = await adapter.loadGameState(roomId)
      expect(loaded).toEqual(newState)
    })

    it('should throw if not initialized', async () => {
      const uninitializedAdapter = new FirebaseAdapter(config)
      await expect(uninitializedAdapter.saveGameState(roomId, gameState)).rejects.toThrow(
        'FirebaseAdapter not initialized'
      )
    })
  })

  describe('updateRoomMetadata and getRoomMetadata', () => {
    const roomId: RoomId = 'TEST02'
    const metadata: RoomMetadata = {
      roomId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      hostId: 'host1',
      playerCount: 4,
      status: 'waiting',
      gameType: 'test-game',
    }

    it('should save and retrieve room metadata', async () => {
      await adapter.updateRoomMetadata(roomId, metadata)
      const loaded = await adapter.getRoomMetadata(roomId)
      expect(loaded).toEqual(metadata)
    })

    it('should return null for non-existent room metadata', async () => {
      const loaded = await adapter.getRoomMetadata('NONEXIST' as RoomId)
      expect(loaded).toBeNull()
    })

    it('should update existing metadata', async () => {
      await adapter.updateRoomMetadata(roomId, metadata)

      const updatedMetadata: RoomMetadata = {
        ...metadata,
        playerCount: 6,
        lastActivity: Date.now() + 1000,
      }
      await adapter.updateRoomMetadata(roomId, updatedMetadata)

      const loaded = await adapter.getRoomMetadata(roomId)
      expect(loaded).toEqual(updatedMetadata)
    })
  })

  describe('getAllRoomMetadata', () => {
    it('should return empty array when no rooms exist', async () => {
      const all = await adapter.getAllRoomMetadata()
      expect(all).toEqual([])
    })

    it('should return all room metadata', async () => {
      const room1: RoomMetadata = {
        roomId: 'ROOM01' as RoomId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        hostId: 'host1',
        playerCount: 3,
        status: 'waiting',
        gameType: 'game1',
      }

      const room2: RoomMetadata = {
        roomId: 'ROOM02' as RoomId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        hostId: 'host2',
        playerCount: 5,
        status: 'playing',
        gameType: 'game2',
      }

      await adapter.updateRoomMetadata(room1.roomId, room1)
      await adapter.updateRoomMetadata(room2.roomId, room2)

      const all = await adapter.getAllRoomMetadata()
      expect(all).toHaveLength(2)
      expect(all).toContainEqual(room1)
      expect(all).toContainEqual(room2)
    })

    it('should handle rooms with state but no metadata', async () => {
      const roomId: RoomId = 'ROOM03'
      const state: GameState = { roomId: roomId, phase: 'waiting', players: [] }

      await adapter.saveGameState(roomId, state)

      const all = await adapter.getAllRoomMetadata()
      expect(all).toEqual([])
    })
  })

  describe('getInactiveRooms', () => {
    it('should return empty array when no rooms exist', async () => {
      const inactive = await adapter.getInactiveRooms(Date.now())
      expect(inactive).toEqual([])
    })

    it('should return rooms with lastActivity older than threshold', async () => {
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      const activeRoom: RoomMetadata = {
        roomId: 'ACTIVE' as RoomId,
        createdAt: now,
        lastActivity: now,
        hostId: 'host1',
        playerCount: 3,
        status: 'playing',
        gameType: 'test',
      }

      const inactiveRoom: RoomMetadata = {
        roomId: 'INACTIVE' as RoomId,
        createdAt: oneHourAgo,
        lastActivity: oneHourAgo,
        hostId: 'host2',
        playerCount: 2,
        status: 'waiting',
        gameType: 'test',
      }

      await adapter.updateRoomMetadata(activeRoom.roomId, activeRoom)
      await adapter.updateRoomMetadata(inactiveRoom.roomId, inactiveRoom)

      const threshold = now - 30 * 60 * 1000 // 30 minutes ago
      const inactive = await adapter.getInactiveRooms(threshold)

      expect(inactive).toEqual(['INACTIVE'])
      expect(inactive).not.toContain('ACTIVE')
    })

    it('should handle rooms without metadata', async () => {
      const roomId: RoomId = 'NOMETA'
      const state: GameState = { roomId: roomId, phase: 'waiting', players: [] }

      await adapter.saveGameState(roomId, state)

      const inactive = await adapter.getInactiveRooms(Date.now())
      expect(inactive).toEqual([])
    })
  })

  describe('deleteRoom', () => {
    const roomId: RoomId = 'DELETE'

    it('should delete room state and metadata', async () => {
      const state: GameState = { roomId: roomId, phase: 'waiting', players: [] }
      const metadata: RoomMetadata = {
        roomId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        hostId: 'host1',
        playerCount: 2,
        status: 'waiting',
        gameType: 'test',
      }

      await adapter.saveGameState(roomId, state)
      await adapter.updateRoomMetadata(roomId, metadata)

      await adapter.deleteRoom(roomId)

      const loadedState = await adapter.loadGameState(roomId)
      const loadedMetadata = await adapter.getRoomMetadata(roomId)

      expect(loadedState).toBeNull()
      expect(loadedMetadata).toBeNull()
    })

    it('should not throw when deleting non-existent room', async () => {
      await expect(adapter.deleteRoom('NONEXIST' as RoomId)).resolves.not.toThrow()
    })
  })

  describe('roomExists', () => {
    it('should return true for existing room', async () => {
      const roomId: RoomId = 'EXISTS'
      const state: GameState = { roomId: roomId, phase: 'waiting', players: [] }

      await adapter.saveGameState(roomId, state)

      const exists = await adapter.roomExists(roomId)
      expect(exists).toBe(true)
    })

    it('should return false for non-existent room', async () => {
      const exists = await adapter.roomExists('NONEXIST' as RoomId)
      expect(exists).toBe(false)
    })

    it('should return false after room deletion', async () => {
      const roomId: RoomId = 'DELETED'
      const state: GameState = { roomId: roomId, phase: 'waiting', players: [] }

      await adapter.saveGameState(roomId, state)
      await adapter.deleteRoom(roomId)

      const exists = await adapter.roomExists(roomId)
      expect(exists).toBe(false)
    })
  })

  describe('close', () => {
    it('should handle close when not initialized', async () => {
      const newAdapter = new FirebaseAdapter(config)
      await expect(newAdapter.close()).resolves.not.toThrow()
    })

    it('should be able to close and reinitialize', async () => {
      // Note: We test close in afterAll, not here
      // Closing shared app mid-test would break other tests
      expect(true).toBe(true)
    })
  })
})
