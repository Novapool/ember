/**
 * SocketServer - Express + Socket.io wrapper for Bonfire games
 *
 * Provides complete server infrastructure with:
 * - HTTP server (Express) with health check
 * - WebSocket connections (Socket.io)
 * - Room lifecycle management
 * - Player connection/disconnection handling
 * - Admin utilities (stats, force-end, kick)
 */

import express from 'express'
import { createServer, type Server as HTTPServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import type {
  ServerConfig,
  TypedSocketServer,
  TypedSocket,
  SocketContext,
  ServerStats,
  ClientToServerEvents,
  ServerToClientEvents,
  RoomReconnectResponse,
} from '../types'
import type { IDatabaseAdapter } from '../database/IDatabaseAdapter'
import type { SocialGame, PlayerId, RoomId, GameState } from '@bonfire/core'
import { RoomManager, type GameFactory } from './RoomManager'
import {
  ServerError,
  RoomNotFoundError,
  UnauthorizedError,
  InvalidActionError,
} from '../utils/errors'

/**
 * Main server class for Bonfire games
 */
export class SocketServer<T extends SocialGame<any> = SocialGame<any>> {
  private httpServer!: HTTPServer
  private io!: TypedSocketServer
  private app: express.Application
  private roomManager!: RoomManager<T>
  private socketContexts: Map<string, SocketContext> = new Map()
  private startTime: number = 0
  private initialized: boolean = false

  constructor(
    private readonly config: ServerConfig,
    private readonly databaseAdapter: IDatabaseAdapter,
    private readonly gameFactory: GameFactory<T>,
    private readonly gameType: string
  ) {
    this.app = express()
  }

  /**
   * Initialize server (setup Express, Socket.io, RoomManager)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Initialize database adapter
    await this.databaseAdapter.initialize()

    // Setup Express and Socket.io
    this.setupExpress()
    this.setupSocketIo()

    // Create RoomManager
    this.roomManager = new RoomManager<T>(
      this.io,
      this.databaseAdapter,
      this.gameFactory,
      this.gameType,
      {
        defaultTTL: this.config.room?.defaultTTL,
        maxRooms: this.config.room?.maxRooms,
        cleanupInterval: this.config.room?.cleanupInterval,
      }
    )

    // Start cleanup
    this.roomManager.startCleanup()

    this.initialized = true
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        this.startTime = Date.now()
        resolve()
      })
    })
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.initialized) {
      return
    }

    // Notify all clients
    this.io.emit('room:closed', 'Server shutting down')

    // Close Socket.io (this also closes the HTTP server)
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve())
    })
  }

  /**
   * Shutdown server completely (cleanup resources)
   */
  async shutdown(): Promise<void> {
    await this.stop()
    await this.roomManager.shutdown()
    await this.databaseAdapter.close()
    this.socketContexts.clear()
    this.initialized = false
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    const rooms = this.roomManager.listRooms()

    // Count rooms by status
    const roomsByStatus: Record<string, number> = {
      waiting: 0,
      playing: 0,
      ended: 0,
      closed: 0,
    }

    for (const room of rooms) {
      roomsByStatus[room.status] = (roomsByStatus[room.status] || 0) + 1
    }

    return {
      totalRooms: this.roomManager.getRoomCount(),
      totalPlayers: this.roomManager.getPlayerCount(),
      roomsByStatus,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
    }
  }

  /**
   * Get HTTP server instance
   */
  getHttpServer(): HTTPServer {
    return this.httpServer
  }

  /**
   * Setup Express middleware and routes
   */
  private setupExpress(): void {
    // Basic middleware
    this.app.use(express.json())

    // CORS (if configured)
    if (this.config.cors) {
      this.app.use((req, res, next) => {
        const origin = Array.isArray(this.config.cors!.origin)
          ? this.config.cors!.origin[0]
          : this.config.cors!.origin
        res.header('Access-Control-Allow-Origin', origin)
        res.header('Access-Control-Allow-Credentials', 'true')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key')
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

        if (req.method === 'OPTIONS') {
          return res.sendStatus(200)
        }
        next()
      })
    }

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', uptime: Date.now() - this.startTime })
    })

    // Admin routes (if enabled)
    if (this.config.admin?.enabled) {
      this.setupAdminRoutes()
    }

    // Create HTTP server
    this.httpServer = createServer(this.app)
  }

  /**
   * Setup Socket.io server and event handlers
   */
  private setupSocketIo(): void {
    this.io = new SocketIO<ClientToServerEvents, ServerToClientEvents>(this.httpServer, {
      cors: this.config.cors,
    }) as TypedSocketServer

    // Connection handler
    this.io.on('connection', (socket: TypedSocket) => {
      // Create socket context
      const context: SocketContext = { socket }
      this.socketContexts.set(socket.id, context)

      // Setup event handlers
      this.setupEventHandlers(socket)

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket).catch((error) => {
          console.error('Error handling disconnect:', error)
        })
      })
    })
  }

  /**
   * Setup event handlers for a socket
   */
  private setupEventHandlers(socket: TypedSocket): void {
    socket.on('room:create', (gameType, hostName, callback) => {
      this.handleRoomCreate(socket, gameType, hostName, callback)
    })

    socket.on('room:join', (roomId, playerName, callback) => {
      this.handleRoomJoin(socket, roomId, playerName, callback)
    })

    socket.on('room:leave', (callback) => {
      this.handleRoomLeave(socket, callback)
    })

    socket.on('game:start', (callback) => {
      this.handleGameStart(socket, callback)
    })

    socket.on('game:action', (actionType, payload, callback) => {
      this.handleGameAction(socket, actionType, payload, callback)
    })

    socket.on('state:request', (callback) => {
      this.handleStateRequest(socket, callback)
    })

    socket.on('room:reconnect', (roomId, playerId, callback) => {
      this.handleRoomReconnect(socket, roomId, playerId, callback)
    })
  }

  /**
   * Handle room creation
   */
  private async handleRoomCreate(
    socket: TypedSocket,
    gameType: string,
    hostName: string,
    callback: (response: any) => void
  ): Promise<void> {
    try {
      // Validate inputs
      if (!gameType || typeof gameType !== 'string') {
        callback({ success: false, error: 'Invalid game type', code: 'INVALID_INPUT' })
        return
      }
      if (!hostName || typeof hostName !== 'string' || hostName.trim().length === 0) {
        callback({ success: false, error: 'Invalid host name', code: 'INVALID_INPUT' })
        return
      }

      // Generate host player ID
      const hostPlayerId: PlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create room
      const room = await this.roomManager.createRoom(hostPlayerId)

      // Add host as player to game
      const hostPlayer = {
        id: hostPlayerId,
        name: hostName.trim(),
        isHost: true,
        isConnected: true,
        joinedAt: Date.now(),
      }

      const joinResult = await room.game.joinPlayer(hostPlayer)
      if (!joinResult.success) {
        // Clean up room if player join fails
        await this.roomManager.deleteRoom(room.roomId)
        callback({ success: false, error: joinResult.error, code: 'PLAYER_JOIN_FAILED' })
        return
      }

      // Register, track, and join Socket.io room
      room.synchronizer.registerPlayer(hostPlayerId, socket.id)
      this.roomManager.trackPlayer(hostPlayerId, room.roomId)

      const context = this.socketContexts.get(socket.id)!
      context.playerId = hostPlayerId
      context.roomId = room.roomId

      socket.join(room.roomId)

      // Update activity
      await this.roomManager.updateActivity(room.roomId)

      // Update metadata
      await this.roomManager.updateRoomMetadata(room.roomId, {
        playerCount: room.game.getPlayers().length,
      })

      // Success response
      callback({
        success: true,
        roomId: room.roomId,
        state: room.game.getState(),
      })
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle room join
   */
  private async handleRoomJoin(
    socket: TypedSocket,
    roomId: RoomId,
    playerName: string,
    callback: (response: any) => void
  ): Promise<void> {
    try {
      // Validate inputs
      if (!roomId || typeof roomId !== 'string') {
        callback({ success: false, error: 'Invalid room ID', code: 'INVALID_INPUT' })
        return
      }
      if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
        callback({ success: false, error: 'Invalid player name', code: 'INVALID_INPUT' })
        return
      }

      // Get room
      const room = this.roomManager.getRoom(roomId)

      // Generate player ID
      const playerId: PlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Add player to game
      const player = {
        id: playerId,
        name: playerName.trim(),
        isHost: false,
        isConnected: true,
        joinedAt: Date.now(),
      }

      const joinResult = await room.game.joinPlayer(player)
      if (!joinResult.success) {
        callback({ success: false, error: joinResult.error, code: 'PLAYER_JOIN_FAILED' })
        return
      }

      // Register, track, and join
      room.synchronizer.registerPlayer(playerId, socket.id)
      this.roomManager.trackPlayer(playerId, roomId)

      const context = this.socketContexts.get(socket.id)!
      context.playerId = playerId
      context.roomId = roomId

      socket.join(roomId)

      // Update activity
      await this.roomManager.updateActivity(roomId)

      // Update metadata
      await this.roomManager.updateRoomMetadata(roomId, {
        playerCount: room.game.getPlayers().length,
      })

      // Success response
      callback({
        success: true,
        playerId,
        state: room.game.getState(),
      })
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle room leave
   */
  private async handleRoomLeave(
    socket: TypedSocket,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const context = this.socketContexts.get(socket.id)
      if (!context?.playerId || !context?.roomId) {
        callback?.({ success: false, error: 'Not in a room', code: 'NOT_IN_ROOM' })
        return
      }

      const room = this.roomManager.getRoom(context.roomId)

      // Remove from game
      const leaveResult = await room.game.leavePlayer(context.playerId)
      if (!leaveResult.success) {
        callback?.({ success: false, error: leaveResult.error, code: 'LEAVE_FAILED' })
        return
      }

      // Unregister, untrack, leave
      room.synchronizer.unregisterPlayer(context.playerId)
      this.roomManager.untrackPlayer(context.playerId)
      socket.leave(context.roomId)

      // Clear context
      context.playerId = undefined
      context.roomId = undefined

      // Update activity and metadata
      await this.roomManager.updateActivity(room.roomId)
      await this.roomManager.updateRoomMetadata(room.roomId, {
        playerCount: room.game.getPlayers().length,
      })

      callback?.({ success: true })
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle game start
   */
  private async handleGameStart(
    socket: TypedSocket,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const context = this.socketContexts.get(socket.id)
      if (!context?.playerId || !context?.roomId) {
        callback?.({ success: false, error: 'Not in a room', code: 'NOT_IN_ROOM' })
        return
      }

      const room = this.roomManager.getRoom(context.roomId)

      // Verify player is host
      const player = room.game.getPlayers().find((p) => p.id === context.playerId)
      if (!player?.isHost) {
        callback?.({ success: false, error: 'Only host can start game', code: 'UNAUTHORIZED' })
        return
      }

      // Start game
      const startResult = await room.game.startGame()
      if (!startResult.success) {
        callback?.({ success: false, error: startResult.error, code: 'START_FAILED' })
        return
      }

      // Update room metadata status
      await this.roomManager.updateRoomMetadata(context.roomId, {
        status: 'playing',
      })

      // Update activity
      await this.roomManager.updateActivity(context.roomId)

      callback?.({ success: true })
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle game action — routes to the game's handleAction implementation
   */
  private async handleGameAction(
    socket: TypedSocket,
    actionType: string,
    payload: unknown,
    callback?: (response: any) => void
  ): Promise<void> {
    try {
      const context = this.socketContexts.get(socket.id)
      if (!context?.playerId || !context?.roomId) {
        callback?.({ success: false, error: 'Not in a room', code: 'NOT_IN_ROOM' })
        return
      }

      // Validate action type
      if (!actionType || typeof actionType !== 'string') {
        callback?.({ success: false, error: 'Invalid action type', code: 'INVALID_INPUT' })
        return
      }

      const room = this.roomManager.getRoom(context.roomId)

      // Update activity
      await this.roomManager.updateActivity(context.roomId)

      // Delegate to the game's handleAction implementation
      const action = {
        playerId: context.playerId,
        type: actionType,
        payload: payload ?? {},
        timestamp: Date.now(),
      }
      const result = await room.game.handleAction(action)
      callback?.(result)
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle state request (for reconnection)
   */
  private async handleStateRequest(
    socket: TypedSocket,
    callback: (response: any) => void
  ): Promise<void> {
    try {
      const context = this.socketContexts.get(socket.id)
      if (!context?.playerId || !context?.roomId) {
        callback({ success: false, error: 'Not in a room', code: 'NOT_IN_ROOM' })
        return
      }

      const room = this.roomManager.getRoom(context.roomId)

      // Re-register player with new socket ID (reconnection scenario)
      room.synchronizer.registerPlayer(context.playerId, socket.id)

      // Ensure socket is in room
      socket.join(context.roomId)

      // Update activity
      await this.roomManager.updateActivity(context.roomId)

      // Return current state
      callback({
        success: true,
        state: room.game.getState(),
      })
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle room reconnect (page refresh recovery)
   */
  private async handleRoomReconnect(
    socket: TypedSocket,
    roomId: RoomId,
    playerId: PlayerId,
    callback: (response: RoomReconnectResponse) => void
  ): Promise<void> {
    try {
      if (!roomId || typeof roomId !== 'string') {
        callback({ success: false, error: 'Invalid room ID', code: 'INVALID_INPUT' })
        return
      }
      if (!playerId || typeof playerId !== 'string') {
        callback({ success: false, error: 'Invalid player ID', code: 'INVALID_INPUT' })
        return
      }

      if (!this.roomManager.hasRoom(roomId)) {
        callback({ success: false, error: 'Room not found', code: 'ROOM_NOT_FOUND' })
        return
      }

      const room = this.roomManager.getRoom(roomId)
      const player = room.game.getPlayer(playerId)
      if (!player) {
        callback({ success: false, error: 'Session expired', code: 'SESSION_EXPIRED' })
        return
      }

      // Re-register socket mapping and re-join the Socket.io room
      room.synchronizer.registerPlayer(playerId, socket.id)
      this.roomManager.trackPlayer(playerId, roomId)

      const context = this.socketContexts.get(socket.id)!
      context.playerId = playerId
      context.roomId = roomId

      socket.join(roomId)

      // Mark player as reconnected (cancels timeout timer, sets isConnected = true)
      await room.game.reconnectPlayer(playerId)

      await this.roomManager.updateActivity(roomId)

      callback({ success: true, state: room.game.getState() as GameState, playerId })
    } catch (error) {
      this.handleError(socket, error, callback)
    }
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(socket: TypedSocket): Promise<void> {
    try {
      const context = this.socketContexts.get(socket.id)
      if (!context?.playerId || !context?.roomId) {
        this.socketContexts.delete(socket.id)
        return
      }

      const room = this.roomManager.getRoom(context.roomId)

      // Check for close-on-host-leave strategy
      const strategy = room.game.config.disconnectStrategy ?? 'reconnect-window'
      const disconnectingPlayer = room.game.getPlayer(context.playerId)
      if (disconnectingPlayer?.isHost && strategy === 'close-on-host-leave') {
        this.io.to(context.roomId).emit('room:closed', 'Host disconnected')
        await this.roomManager.deleteRoom(context.roomId)
        this.socketContexts.delete(socket.id)
        return
      }

      // Call disconnectPlayer (PlayerManager handles timeout; strategy applied inside)
      await room.game.disconnectPlayer(context.playerId)

      // Unregister from synchronizer
      room.synchronizer.unregisterPlayer(context.playerId)

      // Keep tracked for reconnection window
      // (untrackPlayer will be called if reconnection times out)

      // Clear socket context
      this.socketContexts.delete(socket.id)

      // Update activity
      await this.roomManager.updateActivity(context.roomId)
    } catch (error) {
      // Room might have been deleted, ignore errors
      this.socketContexts.delete(socket.id)
    }
  }

  /**
   * Setup admin routes
   */
  private setupAdminRoutes(): void {
    const validateAdminKey = (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const apiKey = req.headers['x-api-key']
      if (apiKey !== this.config.admin?.apiKey) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      next()
    }

    // GET /admin/stats
    this.app.get('/admin/stats', validateAdminKey, (req, res) => {
      try {
        const stats = this.getStats()
        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' })
      }
    })

    // POST /admin/force-end/:roomId
    this.app.post('/admin/force-end/:roomId', validateAdminKey, async (req, res) => {
      try {
        const roomId = req.params.roomId as RoomId
        const room = this.roomManager.getRoom(roomId)

        // End game
        await room.game.endGame()

        // Emit room:closed to all players
        this.io.to(roomId).emit('room:closed', 'Room forcefully ended by admin')

        // Delete room
        await this.roomManager.deleteRoom(roomId)

        res.json({ success: true })
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          res.status(404).json({ error: error.message })
        } else {
          res.status(500).json({ error: 'Failed to end room' })
        }
      }
    })

    // POST /admin/kick/:roomId/:playerId
    this.app.post('/admin/kick/:roomId/:playerId', validateAdminKey, async (req, res) => {
      try {
        const roomId = req.params.roomId as RoomId
        const playerId = req.params.playerId as PlayerId

        const room = this.roomManager.getRoom(roomId)

        // Remove player from game
        await room.game.leavePlayer(playerId)

        // Unregister and untrack
        room.synchronizer.unregisterPlayer(playerId)
        this.roomManager.untrackPlayer(playerId)

        // Find socket and notify/disconnect
        for (const [socketId, context] of this.socketContexts.entries()) {
          if (context.playerId === playerId && context.roomId === roomId) {
            const socket = context.socket
            socket.emit('room:closed', 'You were kicked by admin')
            socket.leave(roomId)
            context.playerId = undefined
            context.roomId = undefined
            break
          }
        }

        // Update metadata
        await this.roomManager.updateRoomMetadata(roomId, {
          playerCount: room.game.getPlayers().length,
        })

        res.json({ success: true })
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          res.status(404).json({ error: error.message })
        } else {
          res.status(500).json({ error: 'Failed to kick player' })
        }
      }
    })
  }

  /**
   * Centralized error handler
   */
  private handleError(
    socket: TypedSocket,
    error: unknown,
    callback?: (response: any) => void
  ): void {
    console.error('Socket error:', error)

    if (error instanceof ServerError) {
      callback?.({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      })
    } else if (error instanceof Error) {
      callback?.({
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      })
    } else {
      callback?.({
        success: false,
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      })
    }
  }
}
