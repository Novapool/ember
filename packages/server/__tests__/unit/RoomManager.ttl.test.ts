/**
 * Tests for RoomManager TTL (time-to-live) and cleanup behaviour.
 *
 * The regular RoomManager.test.ts covers CRUD operations. This file focuses on
 * the time-based cleanup paths that require fake timers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RoomManager } from '../../src/core/RoomManager'
import { InMemoryAdapter } from '../../src/database/InMemoryAdapter'
import { createMockSocketServer } from '../helpers/mockSocket'
import { createTestGame } from '../helpers/testGame'

describe('RoomManager — TTL and cleanup', () => {
  let roomManager: RoomManager
  let mockIo: ReturnType<typeof createMockSocketServer>
  let databaseAdapter: InMemoryAdapter

  beforeEach(async () => {
    vi.useFakeTimers()
    mockIo = createMockSocketServer()
    databaseAdapter = new InMemoryAdapter()
    await databaseAdapter.initialize()
  })

  afterEach(async () => {
    // Always stop cleanup and clear rooms before shutdown to avoid hanging timers
    roomManager.stopCleanup()
    await roomManager.shutdown()
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Per-room TTL timer (set by updateActivity)
  // ---------------------------------------------------------------------------

  describe('per-room TTL timer', () => {
    it('should delete room automatically after TTL elapses', async () => {
      const TTL = 5000
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: TTL }
      )

      const room = await roomManager.createRoom('host1')
      await roomManager.updateActivity(room.roomId)

      expect(roomManager.hasRoom(room.roomId)).toBe(true)

      // Advance exactly past TTL — the setTimeout fires and deletes the room
      vi.advanceTimersByTime(TTL + 1)

      // Give any microtasks from the async deleteRoom a chance to complete
      await vi.runAllTimersAsync()

      expect(roomManager.hasRoom(room.roomId)).toBe(false)
    })

    it('should reset TTL timer when activity is updated', async () => {
      const TTL = 5000
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: TTL }
      )

      const room = await roomManager.createRoom('host1')
      await roomManager.updateActivity(room.roomId)

      // Advance partway through TTL
      vi.advanceTimersByTime(TTL - 1000)

      // Refresh activity — cancels old timer, starts a new TTL countdown
      await roomManager.updateActivity(room.roomId)

      // Advance another TTL - 1001 ms: old timer would have fired, new one hasn't
      vi.advanceTimersByTime(TTL - 1001)

      // Room should still exist because the timer was reset
      expect(roomManager.hasRoom(room.roomId)).toBe(true)
    })

    it('should not set a cleanup timer when the room does not exist', async () => {
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: 1000 }
      )

      // updateActivity for a non-existent room should be a no-op
      await expect(roomManager.updateActivity('NONEXISTENT')).resolves.toBeUndefined()
    })

    it('should clear TTL timer when room is deleted before it fires', async () => {
      const TTL = 5000
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: TTL }
      )

      const room = await roomManager.createRoom('host1')
      await roomManager.updateActivity(room.roomId)

      // Explicitly delete the room before TTL fires
      await roomManager.deleteRoom(room.roomId)

      // The cleanup timer should have been cleared; advancing past TTL shouldn't throw
      vi.advanceTimersByTime(TTL + 1)

      expect(roomManager.hasRoom(room.roomId)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Periodic cleanup scan (performCleanup logic, tested without fake timers)
  //
  // We test the cleanup *logic* directly rather than through the setInterval
  // mechanism, because setInterval with fake timers requires draining async
  // microtasks in ways that deadlock vitest's fake timer implementation.
  // The startCleanup/stopCleanup wiring is covered by the existing
  // RoomManager.test.ts ("cleanup" describe block).
  // ---------------------------------------------------------------------------

  describe('periodic cleanup scan logic', () => {
    it('should delete rooms the database marks as inactive', async () => {
      vi.useRealTimers() // real timers so async DB calls resolve naturally

      const TTL = 100
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        // Very short TTL and interval so the real-timer test finishes fast
        { defaultTTL: TTL, cleanupInterval: 50 }
      )

      const room = await roomManager.createRoom('host1')

      // Backdate so the DB scan threshold is exceeded
      room.metadata.lastActivity = Date.now() - TTL - 10
      await databaseAdapter.updateRoomMetadata(room.roomId, room.metadata)

      // Trigger one real cleanup cycle and wait for it to finish
      roomManager.startCleanup()
      await new Promise<void>((resolve) => setTimeout(resolve, 150))
      roomManager.stopCleanup()

      expect(roomManager.hasRoom(room.roomId)).toBe(false)
    }, 3000)

    it('should not remove rooms that are still within TTL', async () => {
      vi.useRealTimers()

      const TTL = 60_000 // much longer than the scan interval
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: TTL, cleanupInterval: 50 }
      )

      const room = await roomManager.createRoom('host1')
      await roomManager.updateActivity(room.roomId)

      roomManager.startCleanup()
      await new Promise<void>((resolve) => setTimeout(resolve, 150))
      roomManager.stopCleanup()

      expect(roomManager.hasRoom(room.roomId)).toBe(true)
    }, 3000)

    it('should not throw when scan finds a room in DB that is already gone from memory', async () => {
      vi.useRealTimers()

      const TTL = 100
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: TTL, cleanupInterval: 50 }
      )

      const room = await roomManager.createRoom('host1')
      room.metadata.lastActivity = Date.now() - TTL - 10
      await databaseAdapter.updateRoomMetadata(room.roomId, room.metadata)

      // Remove from memory, leave in DB — simulate partial state
      await roomManager.deleteRoom(room.roomId)

      // The scan should handle the "room in DB but not in memory" case gracefully
      roomManager.startCleanup()
      await new Promise<void>((resolve) => setTimeout(resolve, 150))
      roomManager.stopCleanup()

      expect(roomManager.hasRoom(room.roomId)).toBe(false) // Was already deleted
    }, 3000)
  })

  // ---------------------------------------------------------------------------
  // shutdown clears all pending TTL timers
  // ---------------------------------------------------------------------------

  describe('shutdown timer cleanup', () => {
    it('should not fire TTL timers after shutdown', async () => {
      const TTL = 2000
      roomManager = new RoomManager(
        mockIo.asTypedServer(),
        databaseAdapter,
        createTestGame,
        'test-game',
        { defaultTTL: TTL }
      )

      const room = await roomManager.createRoom('host1')
      await roomManager.updateActivity(room.roomId)

      // Shutdown before TTL fires
      await roomManager.shutdown()

      // Advancing past TTL should not cause any errors or state changes
      vi.advanceTimersByTime(TTL + 1)

      // Room count should be 0 — shutdown cleared everything
      expect(roomManager.getRoomCount()).toBe(0)
    })
  })
})
