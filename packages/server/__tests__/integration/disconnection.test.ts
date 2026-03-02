/**
 * Integration tests for connection lifecycle
 *
 * Tests disconnect/reconnect scenarios:
 * - Disconnect marks player as disconnected
 * - Reconnect restores session
 * - Timeout removes player
 * - Cleanup on disconnect
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestServer, type TestServerSetup } from './fixtures/testServer'
import { createTestClient, connectClient, disconnectClient, waitForEvent, type TestSocket } from './fixtures/socketClient'
import { SocketServer } from '../../src/core/SocketServer'
import { InMemoryAdapter } from '../../src/database/InMemoryAdapter'
import { createTestGame } from '../helpers/testGame'
import type { ServerConfig } from '../../src/types'

describe('Connection Lifecycle Integration', () => {
  let testSetup: TestServerSetup
  let port: number

  beforeEach(async () => {
    testSetup = await createTestServer()
    port = testSetup.port
  })

  afterEach(async () => {
    await testSetup.cleanup()
  })

  it('should handle player disconnect', async () => {
    // Create room
    const host = createTestClient(port)
    await connectClient(host)

    const createResponse = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    const roomId = createResponse.roomId

    // Join with player
    const player = createTestClient(port)
    await connectClient(player)

    const joinResponse = await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })
    expect(joinResponse.success).toBe(true)

    // Disconnect player
    await disconnectClient(player)

    // Wait a bit for disconnect to process
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Host should still be connected
    const stateResponse = await new Promise<any>((resolve) => {
      host.emit('state:request', resolve)
    })

    expect(stateResponse.success).toBe(true)
    expect(stateResponse.state.players).toHaveLength(2)

    // Disconnected player should be marked as disconnected
    const disconnectedPlayer = stateResponse.state.players.find(
      (p: any) => p.id === joinResponse.playerId
    )
    expect(disconnectedPlayer).toBeDefined()
    expect(disconnectedPlayer.isConnected).toBe(false)

    await disconnectClient(host)
  })

  it('should allow reconnection with state:request', async () => {
    // Create room
    const host = createTestClient(port)
    await connectClient(host)

    const createResponse = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    const roomId = createResponse.roomId

    // Join with player
    const player1 = createTestClient(port)
    await connectClient(player1)

    const joinResponse = await new Promise<any>((resolve) => {
      player1.emit('room:join', roomId, 'Player2', resolve)
    })
    const playerId = joinResponse.playerId

    // Disconnect
    await disconnectClient(player1)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Reconnect with new socket (simulated)
    // In real scenario, client would store playerId and reconnect
    // For now, create new connection and request state
    const player2 = createTestClient(port)
    await connectClient(player2)

    // Join again with same name (new player ID though)
    const rejoinResponse = await new Promise<any>((resolve) => {
      player2.emit('room:join', roomId, 'Player2Reconnected', resolve)
    })

    expect(rejoinResponse.success).toBe(true)
    expect(rejoinResponse.state.players).toHaveLength(3) // Host + disconnected player + new player

    await disconnectClient(host)
    await disconnectClient(player2)
  })

  it('should cleanup socket context on disconnect', async () => {
    const client = createTestClient(port)
    await connectClient(client)

    const createResponse = await new Promise<any>((resolve) => {
      client.emit('room:create', 'test-game', 'Host', resolve)
    })

    expect(createResponse.success).toBe(true)

    // Disconnect
    await disconnectClient(client)

    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Reconnect
    const client2 = createTestClient(port)
    await connectClient(client2)

    // Should be able to create new room (no stale context)
    const createResponse2 = await new Promise<any>((resolve) => {
      client2.emit('room:create', 'test-game', 'Host2', resolve)
    })

    expect(createResponse2.success).toBe(true)
    expect(createResponse2.roomId).not.toBe(createResponse.roomId)

    await disconnectClient(client2)
  })

  it('should handle disconnect without room', async () => {
    const client = createTestClient(port)
    await connectClient(client)

    // Disconnect without joining any room
    await disconnectClient(client)

    // Should not throw errors
    await new Promise((resolve) => setTimeout(resolve, 100))

    // No assertions needed - test passes if no errors
  })

  it('should handle multiple rapid connects/disconnects', async () => {
    const clients: TestSocket[] = []

    // Create room first
    const host = createTestClient(port)
    await connectClient(host)

    const createResponse = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    const roomId = createResponse.roomId

    // Rapidly connect/disconnect multiple clients
    for (let i = 0; i < 5; i++) {
      const client = createTestClient(port)
      await connectClient(client)
      clients.push(client)

      await new Promise<any>((resolve) => {
        client.emit('room:join', roomId, `Player${i}`, resolve)
      })

      await disconnectClient(client)
    }

    // Wait for all disconnects to process
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Host should still be connected
    const stateResponse = await new Promise<any>((resolve) => {
      host.emit('state:request', resolve)
    })

    expect(stateResponse.success).toBe(true)

    await disconnectClient(host)
  })

  it('should handle disconnect during game', async () => {
    // Create and start game
    const host = createTestClient(port)
    await connectClient(host)

    const createResponse = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    const roomId = createResponse.roomId

    const player = createTestClient(port)
    await connectClient(player)

    await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })

    // Start game
    const startResponse = await new Promise<any>((resolve) => {
      host.emit('game:start', resolve)
    })
    expect(startResponse.success).toBe(true)

    // Disconnect player during active game
    await disconnectClient(player)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Host should still be in game
    const stateResponse = await new Promise<any>((resolve) => {
      host.emit('state:request', resolve)
    })

    expect(stateResponse.success).toBe(true)
    expect(stateResponse.state.phase).toBe('playing')

    await disconnectClient(host)
  })
})

// ---------------------------------------------------------------------------
// room:reconnect event
// ---------------------------------------------------------------------------

describe('room:reconnect Integration', () => {
  let testSetup: TestServerSetup
  let port: number

  beforeEach(async () => {
    testSetup = await createTestServer()
    port = testSetup.port
  })

  afterEach(async () => {
    await testSetup.cleanup()
  })

  it('should successfully reconnect with valid roomId and playerId', async () => {
    // Create room and join player
    const host = createTestClient(port)
    await connectClient(host)
    const createRes = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    const roomId = createRes.roomId

    const player = createTestClient(port)
    await connectClient(player)
    const joinRes = await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })
    const playerId = joinRes.playerId

    // Simulate disconnect (player goes away)
    await disconnectClient(player)
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Reconnect with a fresh socket carrying the stored identity
    const playerReconnected = createTestClient(port)
    await connectClient(playerReconnected)

    const reconnectRes = await new Promise<any>((resolve) => {
      playerReconnected.emit('room:reconnect', roomId, playerId, resolve)
    })

    expect(reconnectRes.success).toBe(true)
    expect(reconnectRes.playerId).toBe(playerId)
    expect(reconnectRes.state).toBeDefined()
    expect(reconnectRes.state.roomId).toBe(roomId)

    await disconnectClient(host)
    await disconnectClient(playerReconnected)
  })

  it('should reject reconnect with empty roomId', async () => {
    const client = createTestClient(port)
    await connectClient(client)

    const res = await new Promise<any>((resolve) => {
      client.emit('room:reconnect', '', 'some-player-id', resolve)
    })

    expect(res.success).toBe(false)
    expect(res.code).toBe('INVALID_INPUT')

    await disconnectClient(client)
  })

  it('should reject reconnect with empty playerId', async () => {
    const client = createTestClient(port)
    await connectClient(client)

    const res = await new Promise<any>((resolve) => {
      client.emit('room:reconnect', 'ABCDEF', '', resolve)
    })

    expect(res.success).toBe(false)
    expect(res.code).toBe('INVALID_INPUT')

    await disconnectClient(client)
  })

  it('should return ROOM_NOT_FOUND when room does not exist', async () => {
    const client = createTestClient(port)
    await connectClient(client)

    const res = await new Promise<any>((resolve) => {
      client.emit('room:reconnect', 'NOROOM', 'player-123', resolve)
    })

    expect(res.success).toBe(false)
    expect(res.code).toBe('ROOM_NOT_FOUND')

    await disconnectClient(client)
  })

  it('should return SESSION_EXPIRED when playerId is not in the room', async () => {
    // Create a room
    const host = createTestClient(port)
    await connectClient(host)
    const createRes = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    const roomId = createRes.roomId

    // Try to reconnect with a player ID that was never in the room
    const client = createTestClient(port)
    await connectClient(client)

    const res = await new Promise<any>((resolve) => {
      client.emit('room:reconnect', roomId, 'nonexistent-player', resolve)
    })

    expect(res.success).toBe(false)
    expect(res.code).toBe('SESSION_EXPIRED')

    await disconnectClient(host)
    await disconnectClient(client)
  })
})

// ---------------------------------------------------------------------------
// close-on-host-leave disconnect strategy
// ---------------------------------------------------------------------------

async function createHostLeaveServer() {
  const config: ServerConfig = {
    port: 0,
    nodeEnv: 'test',
    admin: { enabled: false },
    cors: { origin: '*' },
  }
  const adapter = new InMemoryAdapter()
  const server = new SocketServer(
    config,
    adapter,
    (roomId, sync) => {
      const game = createTestGame(roomId, sync)
      game.config = { ...game.config, disconnectStrategy: 'close-on-host-leave' }
      return game
    },
    'test-game'
  )
  await server.start()
  await new Promise((resolve) => setTimeout(resolve, 100))
  const address = server.getHttpServer().address() as { port: number }
  return {
    port: address.port,
    cleanup: () => server.shutdown(),
  }
}

describe('close-on-host-leave strategy', () => {
  it('should emit room:closed to all players and delete room when host disconnects', async () => {
    const { port, cleanup } = await createHostLeaveServer()

    try {
      const host = createTestClient(port)
      await connectClient(host)
      const createRes = await new Promise<any>((resolve) => {
        host.emit('room:create', 'test-game', 'Host', resolve)
      })
      const roomId = createRes.roomId

      const player = createTestClient(port)
      await connectClient(player)
      await new Promise<any>((resolve) => {
        player.emit('room:join', roomId, 'Player2', resolve)
      })

      // Listen for room:closed on the non-host player
      const roomClosedPromise = waitForEvent(player, 'room:closed')

      // Disconnect the host
      await disconnectClient(host)

      const closeReason = await roomClosedPromise
      expect(closeReason).toContain('Host disconnected')

      // Room should be gone — state:request should fail
      const stateRes = await new Promise<any>((resolve) => {
        player.emit('state:request', resolve)
      })
      expect(stateRes.success).toBe(false)

      await disconnectClient(player)
    } finally {
      await cleanup()
    }
  })

  it('should NOT close room when a non-host player disconnects', async () => {
    const { port, cleanup } = await createHostLeaveServer()

    try {
      const host = createTestClient(port)
      await connectClient(host)
      const createRes = await new Promise<any>((resolve) => {
        host.emit('room:create', 'test-game', 'Host', resolve)
      })
      const roomId = createRes.roomId

      const player = createTestClient(port)
      await connectClient(player)
      await new Promise<any>((resolve) => {
        player.emit('room:join', roomId, 'Player2', resolve)
      })

      // Non-host disconnects
      await disconnectClient(player)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Host should still be in the room
      const stateRes = await new Promise<any>((resolve) => {
        host.emit('state:request', resolve)
      })
      expect(stateRes.success).toBe(true)
      expect(stateRes.state.roomId).toBe(roomId)

      await disconnectClient(host)
    } finally {
      await cleanup()
    }
  })
})
