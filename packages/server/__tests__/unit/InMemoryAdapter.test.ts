/**
 * Tests for InMemoryDatabaseAdapter
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAdapter } from '../../src/database/InMemoryAdapter'
import type { GameState } from '@bonfire-ember/core'
import type { RoomMetadata } from '../../src/types'

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter

  beforeEach(async () => {
    adapter = new InMemoryAdapter()
    await adapter.initialize()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newAdapter = new InMemoryAdapter()
      await expect(newAdapter.initialize()).resolves.toBeUndefined()
    })
  })

  describe('game state operations', () => {
    const mockState: GameState = {
      roomId: 'room1',
      phase: 'waiting',
      players: [
        {
          id: 'player1',
          name: 'Alice',
          isHost: true,
          isConnected: true,
          joinedAt: Date.now(),
        },
      ],
    }

    it('should save and load game state', async () => {
      await adapter.saveGameState('room1', mockState)
      const loaded = await adapter.loadGameState('room1')
      expect(loaded).toEqual(mockState)
    })

    it('should return null for non-existent room', async () => {
      const loaded = await adapter.loadGameState('nonexistent')
      expect(loaded).toBeNull()
    })

    it('should delete room state', async () => {
      await adapter.saveGameState('room1', mockState)
      await adapter.deleteRoom('room1')
      const loaded = await adapter.loadGameState('room1')
      expect(loaded).toBeNull()
    })

    it('should check if room exists', async () => {
      expect(await adapter.roomExists('room1')).toBe(false)
      await adapter.saveGameState('room1', mockState)
      expect(await adapter.roomExists('room1')).toBe(true)
    })
  })

  describe('room metadata operations', () => {
    const mockMetadata: RoomMetadata = {
      roomId: 'room1',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      hostId: 'player1',
      playerCount: 1,
      status: 'waiting',
      gameType: 'test-game',
    }

    it('should save and load room metadata', async () => {
      await adapter.updateRoomMetadata('room1', mockMetadata)
      const loaded = await adapter.getRoomMetadata('room1')
      expect(loaded).toEqual(mockMetadata)
    })

    it('should return null for non-existent metadata', async () => {
      const loaded = await adapter.getRoomMetadata('nonexistent')
      expect(loaded).toBeNull()
    })

    it('should get all room metadata', async () => {
      const metadata1: RoomMetadata = { ...mockMetadata, roomId: 'room1' }
      const metadata2: RoomMetadata = { ...mockMetadata, roomId: 'room2' }

      await adapter.updateRoomMetadata('room1', metadata1)
      await adapter.updateRoomMetadata('room2', metadata2)

      const allMetadata = await adapter.getAllRoomMetadata()
      expect(allMetadata).toHaveLength(2)
      expect(allMetadata).toContainEqual(metadata1)
      expect(allMetadata).toContainEqual(metadata2)
    })

    it('should delete room metadata when deleting room', async () => {
      await adapter.updateRoomMetadata('room1', mockMetadata)
      await adapter.deleteRoom('room1')
      const loaded = await adapter.getRoomMetadata('room1')
      expect(loaded).toBeNull()
    })
  })

  describe('inactive room detection', () => {
    it('should find inactive rooms', async () => {
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000
      const twoHoursAgo = now - 2 * 60 * 60 * 1000

      const metadata1: RoomMetadata = {
        roomId: 'room1',
        createdAt: twoHoursAgo,
        lastActivity: twoHoursAgo, // 2 hours ago
        hostId: 'player1',
        playerCount: 1,
        status: 'waiting',
        gameType: 'test',
      }

      const metadata2: RoomMetadata = {
        roomId: 'room2',
        createdAt: oneHourAgo,
        lastActivity: now, // active now
        hostId: 'player2',
        playerCount: 1,
        status: 'playing',
        gameType: 'test',
      }

      await adapter.updateRoomMetadata('room1', metadata1)
      await adapter.updateRoomMetadata('room2', metadata2)

      const inactiveRooms = await adapter.getInactiveRooms(oneHourAgo)
      expect(inactiveRooms).toEqual(['room1'])
    })

    it('should return empty array if no inactive rooms', async () => {
      const now = Date.now()
      const metadata: RoomMetadata = {
        roomId: 'room1',
        createdAt: now,
        lastActivity: now,
        hostId: 'player1',
        playerCount: 1,
        status: 'waiting',
        gameType: 'test',
      }

      await adapter.updateRoomMetadata('room1', metadata)
      const inactiveRooms = await adapter.getInactiveRooms(now - 1000)
      expect(inactiveRooms).toEqual([])
    })
  })

  describe('utility methods', () => {
    it('should clear all data', async () => {
      const mockState: GameState = {
        roomId: 'room1',
        phase: 'waiting',
        players: [],
      }

      await adapter.saveGameState('room1', mockState)
      expect(adapter.getRoomCount()).toBe(1)

      adapter.clear()
      expect(adapter.getRoomCount()).toBe(0)
    })

    it('should close and clear data', async () => {
      const mockState: GameState = {
        roomId: 'room1',
        phase: 'waiting',
        players: [],
      }

      await adapter.saveGameState('room1', mockState)
      await adapter.close()

      expect(adapter.getRoomCount()).toBe(0)
    })
  })
})
