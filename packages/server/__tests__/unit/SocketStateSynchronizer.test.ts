/**
 * Tests for SocketStateSynchronizer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SocketStateSynchronizer } from '../../src/core/SocketStateSynchronizer'
import { InMemoryAdapter } from '../../src/database/InMemoryAdapter'
import { createMockSocketServer } from '../helpers/mockSocket'
import type { GameState } from '@bonfire-ember/core'

describe('SocketStateSynchronizer', () => {
  let synchronizer: SocketStateSynchronizer<GameState>
  let mockIo: ReturnType<typeof createMockSocketServer>
  let databaseAdapter: InMemoryAdapter

  const roomId = 'ABC123'
  const mockState: GameState = {
    roomId,
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

  beforeEach(async () => {
    mockIo = createMockSocketServer()
    databaseAdapter = new InMemoryAdapter()
    await databaseAdapter.initialize()

    synchronizer = new SocketStateSynchronizer(
      roomId,
      mockIo.asTypedServer(),
      databaseAdapter
    )
  })

  describe('player registration', () => {
    it('should register player socket mappings', () => {
      synchronizer.registerPlayer('player1', 'socket1')
      expect(synchronizer.getSocketId('player1')).toBe('socket1')
    })

    it('should unregister player socket mappings', () => {
      synchronizer.registerPlayer('player1', 'socket1')
      synchronizer.unregisterPlayer('player1')
      expect(synchronizer.getSocketId('player1')).toBeUndefined()
    })

    it('should update socket ID when re-registering player', () => {
      synchronizer.registerPlayer('player1', 'socket1')
      synchronizer.registerPlayer('player1', 'socket2')
      expect(synchronizer.getSocketId('player1')).toBe('socket2')
    })

    it('should get all registered players', () => {
      synchronizer.registerPlayer('player1', 'socket1')
      synchronizer.registerPlayer('player2', 'socket2')
      const players = synchronizer.getRegisteredPlayers()
      expect(players).toHaveLength(2)
      expect(players).toContain('player1')
      expect(players).toContain('player2')
    })

    it('should clear all player mappings', () => {
      synchronizer.registerPlayer('player1', 'socket1')
      synchronizer.registerPlayer('player2', 'socket2')
      synchronizer.clearPlayerMappings()
      expect(synchronizer.getRegisteredPlayers()).toHaveLength(0)
    })
  })

  describe('broadcastState', () => {
    it('should save state to database', async () => {
      await synchronizer.broadcastState(mockState)
      const savedState = await databaseAdapter.loadGameState(roomId)
      expect(savedState).toEqual(mockState)
    })

    it('should broadcast state to Socket.io room', async () => {
      await synchronizer.broadcastState(mockState)
      expect(mockIo.toMock).toHaveBeenCalledWith(roomId)
      const roomEmitter = mockIo.to(roomId)
      expect(roomEmitter.emitMock).toHaveBeenCalledWith('state:update', mockState)
    })

    it('should both save and broadcast', async () => {
      await synchronizer.broadcastState(mockState)

      // Check database
      const savedState = await databaseAdapter.loadGameState(roomId)
      expect(savedState).toEqual(mockState)

      // Check Socket.io
      expect(mockIo.toMock).toHaveBeenCalledWith(roomId)
    })
  })

  describe('sendToPlayer', () => {
    it('should send state to specific player socket', async () => {
      synchronizer.registerPlayer('player1', 'socket1')
      await synchronizer.sendToPlayer('player1', mockState)

      expect(mockIo.toMock).toHaveBeenCalledWith('socket1')
      const socketEmitter = mockIo.to('socket1')
      expect(socketEmitter.emitMock).toHaveBeenCalledWith('state:sync', mockState)
    })

    it('should not emit if player not registered', async () => {
      await synchronizer.sendToPlayer('unknownPlayer', mockState)
      expect(mockIo.toMock).not.toHaveBeenCalled()
    })

    it('should send to correct socket after re-registration', async () => {
      synchronizer.registerPlayer('player1', 'socket1')
      synchronizer.registerPlayer('player1', 'socket2')

      mockIo.reset()

      await synchronizer.sendToPlayer('player1', mockState)
      expect(mockIo.toMock).toHaveBeenCalledWith('socket2')
    })
  })

  describe('broadcastEvent', () => {
    it('should broadcast player:joined event', async () => {
      const player = {
        id: 'player2',
        name: 'Bob',
        isHost: false,
        isConnected: true,
        joinedAt: Date.now(),
      }

      await synchronizer.broadcastEvent('player:joined', { player })

      expect(mockIo.toMock).toHaveBeenCalledWith(roomId)
      const roomEmitter = mockIo.to(roomId)
      expect(roomEmitter.emitMock).toHaveBeenCalledWith('event:emit', {
        type: 'player:joined',
        payload: { player },
      })
    })

    it('should broadcast game:started event', async () => {
      const startedAt = Date.now()
      await synchronizer.broadcastEvent('game:started', { startedAt })

      const roomEmitter = mockIo.to(roomId)
      expect(roomEmitter.emitMock).toHaveBeenCalledWith('event:emit', {
        type: 'game:started',
        payload: { startedAt },
      })
    })

    it('should broadcast phase:changed event', async () => {
      const transition = {
        from: 'waiting',
        to: 'playing',
        timestamp: Date.now(),
      }

      await synchronizer.broadcastEvent('phase:changed', transition)

      const roomEmitter = mockIo.to(roomId)
      expect(roomEmitter.emitMock).toHaveBeenCalledWith('event:emit', {
        type: 'phase:changed',
        payload: transition,
      })
    })
  })

  describe('broadcastCustomEvent', () => {
    it('should broadcast custom event with event:emit', async () => {
      await synchronizer.broadcastCustomEvent('question_revealed', { text: 'What is love?' })

      expect(mockIo.toMock).toHaveBeenCalledWith(roomId)
      const roomEmitter = mockIo.to(roomId)
      expect(roomEmitter.emitMock).toHaveBeenCalledWith('event:emit', {
        type: 'question_revealed',
        payload: { text: 'What is love?' },
      })
    })

    it('should broadcast any arbitrary event type', async () => {
      await synchronizer.broadcastCustomEvent('round_ended', { round: 3, scores: { p1: 10 } })

      const roomEmitter = mockIo.to(roomId)
      expect(roomEmitter.emitMock).toHaveBeenCalledWith('event:emit', {
        type: 'round_ended',
        payload: { round: 3, scores: { p1: 10 } },
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple players with different sockets', async () => {
      synchronizer.registerPlayer('player1', 'socket1')
      synchronizer.registerPlayer('player2', 'socket2')

      await synchronizer.sendToPlayer('player1', mockState)
      await synchronizer.sendToPlayer('player2', mockState)

      expect(mockIo.toMock).toHaveBeenCalledWith('socket1')
      expect(mockIo.toMock).toHaveBeenCalledWith('socket2')
    })

    it('should broadcast to room while sending targeted messages', async () => {
      synchronizer.registerPlayer('player1', 'socket1')

      await synchronizer.broadcastState(mockState)
      await synchronizer.sendToPlayer('player1', mockState)

      // Room broadcast
      expect(mockIo.toMock).toHaveBeenCalledWith(roomId)
      // Targeted message
      expect(mockIo.toMock).toHaveBeenCalledWith('socket1')
    })
  })
})
