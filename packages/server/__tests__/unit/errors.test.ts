/**
 * Tests for custom error classes
 */

import { describe, it, expect } from 'vitest'
import {
  ServerError,
  RoomNotFoundError,
  UnauthorizedError,
  InvalidActionError,
  RoomFullError,
  RateLimitError,
  PlayerNotFoundError,
  DuplicatePlayerError,
  GameStateError,
  ConfigurationError,
  DatabaseError,
} from '../../src/utils/errors'

describe('Error classes', () => {
  describe('ServerError', () => {
    it('should create error with message and code', () => {
      const error = new ServerError('Test error', 'TEST_ERROR')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('ServerError')
    })

    it('should support custom status code', () => {
      const error = new ServerError('Test', 'TEST', 404)
      expect(error.statusCode).toBe(404)
    })

    it('should support details', () => {
      const error = new ServerError('Test', 'TEST', 500, { foo: 'bar' })
      expect(error.details).toEqual({ foo: 'bar' })
    })

    it('should serialize to JSON', () => {
      const error = new ServerError('Test', 'TEST', 400, { key: 'value' })
      const json = error.toJSON()
      expect(json).toEqual({
        name: 'ServerError',
        message: 'Test',
        code: 'TEST',
        statusCode: 400,
        details: { key: 'value' },
      })
    })
  })

  describe('RoomNotFoundError', () => {
    it('should create error with room ID', () => {
      const error = new RoomNotFoundError('ABC123')
      expect(error.message).toContain('ABC123')
      expect(error.code).toBe('ROOM_NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.details).toEqual({ roomId: 'ABC123' })
    })
  })

  describe('UnauthorizedError', () => {
    it('should create error with default message', () => {
      const error = new UnauthorizedError()
      expect(error.message).toBe('Unauthorized')
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.statusCode).toBe(401)
    })

    it('should support custom message and details', () => {
      const error = new UnauthorizedError('Not host', { playerId: 'player1' })
      expect(error.message).toBe('Not host')
      expect(error.details).toEqual({ playerId: 'player1' })
    })
  })

  describe('InvalidActionError', () => {
    it('should create error with action type and reason', () => {
      const error = new InvalidActionError('submit_answer', 'Not your turn')
      expect(error.message).toContain('submit_answer')
      expect(error.message).toContain('Not your turn')
      expect(error.code).toBe('INVALID_ACTION')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({
        actionType: 'submit_answer',
        reason: 'Not your turn',
      })
    })
  })

  describe('RoomFullError', () => {
    it('should create error with room ID and max players', () => {
      const error = new RoomFullError('ABC123', 8)
      expect(error.message).toContain('ABC123')
      expect(error.message).toContain('8')
      expect(error.code).toBe('ROOM_FULL')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('RoomFullError')
      expect(error.details).toEqual({ roomId: 'ABC123', maxPlayers: 8 })
    })

    it('should be an instance of ServerError', () => {
      const error = new RoomFullError('ROOM1', 4)
      expect(error).toBeInstanceOf(ServerError)
    })
  })

  describe('RateLimitError', () => {
    it('should create error with default message', () => {
      const error = new RateLimitError()
      expect(error.message).toBe('Too many requests')
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.statusCode).toBe(429)
      expect(error.name).toBe('RateLimitError')
    })

    it('should accept a custom message', () => {
      const error = new RateLimitError('Slow down!')
      expect(error.message).toBe('Slow down!')
    })
  })

  describe('PlayerNotFoundError', () => {
    it('should create error with player ID', () => {
      const error = new PlayerNotFoundError('player-42')
      expect(error.message).toContain('player-42')
      expect(error.code).toBe('PLAYER_NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe('PlayerNotFoundError')
      expect(error.details).toEqual({ playerId: 'player-42' })
    })
  })

  describe('DuplicatePlayerError', () => {
    it('should create error with player ID', () => {
      const error = new DuplicatePlayerError('player-99')
      expect(error.message).toContain('player-99')
      expect(error.code).toBe('DUPLICATE_PLAYER')
      expect(error.statusCode).toBe(409)
      expect(error.name).toBe('DuplicatePlayerError')
      expect(error.details).toEqual({ playerId: 'player-99' })
    })
  })

  describe('GameStateError', () => {
    it('should create error with message', () => {
      const error = new GameStateError('Game is not in a valid state')
      expect(error.message).toBe('Game is not in a valid state')
      expect(error.code).toBe('GAME_STATE_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('GameStateError')
    })

    it('should accept optional details', () => {
      const error = new GameStateError('Bad state', { phase: 'lobby' })
      expect(error.details).toEqual({ phase: 'lobby' })
    })
  })

  describe('ConfigurationError', () => {
    it('should create error with message', () => {
      const error = new ConfigurationError('Missing required config')
      expect(error.message).toBe('Missing required config')
      expect(error.code).toBe('CONFIGURATION_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('ConfigurationError')
    })

    it('should accept optional details', () => {
      const error = new ConfigurationError('Bad config', { field: 'apiKey' })
      expect(error.details).toEqual({ field: 'apiKey' })
    })
  })

  describe('DatabaseError', () => {
    it('should create error with message', () => {
      const error = new DatabaseError('Connection refused')
      expect(error.message).toBe('Connection refused')
      expect(error.code).toBe('DATABASE_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('DatabaseError')
    })

    it('should accept optional details', () => {
      const error = new DatabaseError('Write failed', { table: 'rooms' })
      expect(error.details).toEqual({ table: 'rooms' })
    })
  })

  describe('error hierarchy', () => {
    it('all custom errors extend ServerError', () => {
      const errors = [
        new RoomNotFoundError('R1'),
        new UnauthorizedError(),
        new InvalidActionError('act', 'reason'),
        new RoomFullError('R1', 4),
        new RateLimitError(),
        new PlayerNotFoundError('p1'),
        new DuplicatePlayerError('p1'),
        new GameStateError('msg'),
        new ConfigurationError('msg'),
        new DatabaseError('msg'),
      ]
      for (const error of errors) {
        expect(error).toBeInstanceOf(ServerError)
        expect(error).toBeInstanceOf(Error)
        expect(typeof error.code).toBe('string')
        expect(typeof error.statusCode).toBe('number')
      }
    })

    it('toJSON includes all error fields for every subclass', () => {
      const error = new RoomFullError('R1', 4)
      const json = error.toJSON()
      expect(json).toHaveProperty('name')
      expect(json).toHaveProperty('message')
      expect(json).toHaveProperty('code')
      expect(json).toHaveProperty('statusCode')
    })
  })
})
