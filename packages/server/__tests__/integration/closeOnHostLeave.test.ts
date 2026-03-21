/**
 * Integration tests for the close-on-host-leave disconnect strategy.
 *
 * When a game is configured with disconnectStrategy: 'close-on-host-leave',
 * the server must:
 * 1. Emit 'room:closed' to all remaining players the moment the host socket disconnects
 * 2. Delete the room from the RoomManager
 *
 * Also covers the SocketServer.handleError unknown-error path, which is reached
 * when a throw value is not an Error instance (e.g. a plain string or object).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SocketServer } from '../../src/core/SocketServer'
import { InMemoryAdapter } from '../../src/database/InMemoryAdapter'
import type { ServerConfig } from '../../src/types'
import {
  createTestClient,
  connectClient,
  disconnectClient,
  waitForEvent,
  type TestSocket,
} from './fixtures/socketClient'
import { SocialGame, type GameState, type GameConfig, type RoomId, type PlayerAction } from '@bonfire/core'
import type { SocketStateSynchronizer } from '../../src/core/SocketStateSynchronizer'

// ---------------------------------------------------------------------------
// A game factory that uses close-on-host-leave strategy
// ---------------------------------------------------------------------------

class HostLeaveGame extends SocialGame<GameState> {
  config: GameConfig = {
    minPlayers: 2,
    maxPlayers: 8,
    phases: ['waiting', 'playing', 'ended'],
    allowJoinInProgress: false,
    disconnectTimeout: 30000,
    disconnectStrategy: 'close-on-host-leave',
  }

  constructor(roomId: RoomId, synchronizer: SocketStateSynchronizer<GameState>) {
    super(roomId, { roomId, phase: 'waiting', players: [] }, synchronizer)
  }

  async onPlayerJoin(): Promise<void> {}
  async onPlayerLeave(): Promise<void> {}
  async onGameStart(): Promise<void> { this.state.phase = 'playing' }
  async onGameEnd(): Promise<void> { this.state.phase = 'ended' }
  async onPhaseChange(): Promise<void> {}
  async handleAction(_action: PlayerAction): Promise<any> {
    return { success: false, error: 'Not implemented', code: 'NOT_IMPLEMENTED' }
  }
}

async function createCloseOnHostLeaveServer(): Promise<{
  server: SocketServer
  port: number
  cleanup: () => Promise<void>
}> {
  const config: ServerConfig = {
    port: 0,
    nodeEnv: 'test',
    cors: { origin: '*' },
  }

  const adapter = new InMemoryAdapter()
  const server = new SocketServer(
    config,
    adapter,
    (roomId, sync) => new HostLeaveGame(roomId, sync as SocketStateSynchronizer<GameState>),
    'host-leave-game'
  )

  await server.start()
  const address = server.getHttpServer().address() as { port: number }
  await new Promise((r) => setTimeout(r, 100))

  return {
    server,
    port: address.port,
    cleanup: async () => { try { await server.shutdown() } catch {} },
  }
}

// ---------------------------------------------------------------------------

describe('close-on-host-leave strategy', () => {
  let setup: Awaited<ReturnType<typeof createCloseOnHostLeaveServer>>

  beforeEach(async () => {
    setup = await createCloseOnHostLeaveServer()
  })

  afterEach(async () => {
    await setup.cleanup()
  })

  it('should emit room:closed to remaining players when host disconnects', async () => {
    const { port } = setup

    // Create a room (host)
    const host = createTestClient(port)
    await connectClient(host)

    const createRes = await new Promise<any>((resolve) => {
      host.emit('room:create', 'host-leave-game', 'Host', resolve)
    })
    expect(createRes.success).toBe(true)
    const roomId = createRes.roomId

    // Second player joins
    const player = createTestClient(port)
    await connectClient(player)

    const joinRes = await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })
    expect(joinRes.success).toBe(true)

    // Listen for room:closed on the remaining player
    const closedPromise = waitForEvent<string>(player, 'room:closed')

    // Host disconnects — should trigger close-on-host-leave
    await disconnectClient(host)

    const closedMessage = await closedPromise
    expect(typeof closedMessage).toBe('string')
    expect(closedMessage).toContain('Host disconnected')

    await disconnectClient(player)
  })

  it('should delete the room from the server after host disconnect', async () => {
    const { port, server } = setup

    const host = createTestClient(port)
    await connectClient(host)

    const createRes = await new Promise<any>((resolve) => {
      host.emit('room:create', 'host-leave-game', 'Host', resolve)
    })
    const roomId = createRes.roomId

    const player = createTestClient(port)
    await connectClient(player)

    await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })

    // Wait for room:closed event to be received so we know server handled disconnect
    const closedPromise = waitForEvent<string>(player, 'room:closed')
    await disconnectClient(host)
    await closedPromise

    // Give server a tick to finish cleanup
    await new Promise((r) => setTimeout(r, 50))

    // A subsequent join attempt on the now-deleted room should fail
    const player2 = createTestClient(port)
    await connectClient(player2)

    const joinRes = await new Promise<any>((resolve) => {
      player2.emit('room:join', roomId, 'Latecomer', resolve)
    })

    expect(joinRes.success).toBe(false)

    await disconnectClient(player)
    await disconnectClient(player2)
  })

  it('should not close room when a non-host disconnects', async () => {
    const { port } = setup

    const host = createTestClient(port)
    await connectClient(host)

    const createRes = await new Promise<any>((resolve) => {
      host.emit('room:create', 'host-leave-game', 'Host', resolve)
    })
    const roomId = createRes.roomId

    const player = createTestClient(port)
    await connectClient(player)

    await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })

    // Non-host player disconnects — should NOT close the room
    await disconnectClient(player)
    await new Promise((r) => setTimeout(r, 100))

    // Host can still request state (room is alive)
    const stateRes = await new Promise<any>((resolve) => {
      host.emit('state:request', resolve)
    })

    expect(stateRes.success).toBe(true)

    await disconnectClient(host)
  })
})

// ---------------------------------------------------------------------------
// handleError: non-Error throw value path
// ---------------------------------------------------------------------------

describe('SocketServer.handleError — unknown error path', () => {
  let setup: Awaited<ReturnType<typeof createCloseOnHostLeaveServer>>

  beforeEach(async () => {
    // Reuse the standard test server fixture from testServer.ts here is fine,
    // but we can just use the close-on-host-leave server — error handling is
    // independent of the game type.
    const config: ServerConfig = { port: 0, nodeEnv: 'test', cors: { origin: '*' } }
    const adapter = new InMemoryAdapter()
    const { createTestGame } = await import('../helpers/testGame')
    const server = new SocketServer(config, adapter, createTestGame, 'test-game')
    await server.start()
    const address = server.getHttpServer().address() as { port: number }
    await new Promise((r) => setTimeout(r, 100))
    setup = {
      server,
      port: address.port,
      cleanup: async () => { try { await server.shutdown() } catch {} },
    }
  })

  afterEach(async () => {
    await setup.cleanup()
  })

  it('should return UNKNOWN_ERROR when a non-Error value is thrown during room:join', async () => {
    const { port, server } = setup

    const host = createTestClient(port)
    await connectClient(host)

    const createRes = await new Promise<any>((resolve) => {
      host.emit('room:create', 'test-game', 'Host', resolve)
    })
    expect(createRes.success).toBe(true)
    const roomId = createRes.roomId

    // Patch the game instance's joinPlayer to throw a plain string (not an Error)
    // We access it via the private roomManager map
    const roomManager = (server as any).roomManager
    const room = roomManager.rooms.get(roomId)
    const origJoinPlayer = room.game.joinPlayer.bind(room.game)
    room.game.joinPlayer = async () => {
      throw 'non-error string thrown'
    }

    const player = createTestClient(port)
    await connectClient(player)

    const joinRes = await new Promise<any>((resolve) => {
      player.emit('room:join', roomId, 'Player2', resolve)
    })

    // The server's handleError should return UNKNOWN_ERROR for non-Error throws
    expect(joinRes.success).toBe(false)
    expect(joinRes.code).toBe('UNKNOWN_ERROR')

    // Restore
    room.game.joinPlayer = origJoinPlayer

    await disconnectClient(host)
    await disconnectClient(player)
  })
})
