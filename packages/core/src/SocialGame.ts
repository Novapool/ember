/**
 * Concrete implementation of the Game class with full functionality
 * Game developers extend this class, not the abstract Game class
 */

import { Game } from './Game';
import { PlayerManager } from './players/PlayerManager';
import { GameEventEmitter } from './events/EventEmitter';
import { StateManager } from './state/StateManager';
import { GameValidator } from './validation/validators';
import { ValidationError, StateError } from './validation/errors';
import type {
  GameState,
  Player,
  PlayerId,
  RoomId,
  Phase,
  RoomStatus,
  GameEventPayloads,
  GameEventType,
  ActionResult,
  PhaseTransition,
} from './types';
import type { OptionalSynchronizer } from './state/IStateSynchronizer';

/**
 * Concrete game class that implements all core functionality
 * Extends the abstract Game class and provides:
 * - Player management with disconnect/reconnect
 * - Event system for lifecycle hooks
 * - State synchronization
 * - Room lifecycle management
 */
export abstract class SocialGame<TState extends GameState = GameState> extends Game<TState> {
  protected playerManager!: PlayerManager;
  protected events: GameEventEmitter<GameEventPayloads>;
  protected synchronizer: OptionalSynchronizer<TState>;
  protected roomStatus: RoomStatus = 'waiting';

  constructor(
    roomId: RoomId,
    initialState: TState,
    synchronizer: OptionalSynchronizer<TState> = null
  ) {
    super(roomId, initialState);
    this.events = new GameEventEmitter<GameEventPayloads>();
    this.synchronizer = synchronizer;
  }

  /**
   * Lazy initialization of PlayerManager (called on first access)
   */
  private ensurePlayerManager(): void {
    if (!this.playerManager) {
      this.playerManager = new PlayerManager(this.config);
    }
  }

  /**
   * Subscribe to game events
   */
  on<K extends GameEventType>(
    event: K,
    handler: (payload: GameEventPayloads[K]) => void | Promise<void>
  ): void {
    this.events.on(event, handler);
  }

  /**
   * Unsubscribe from game events
   */
  off<K extends GameEventType>(
    event: K,
    handler: (payload: GameEventPayloads[K]) => void | Promise<void>
  ): void {
    this.events.off(event, handler);
  }

  /**
   * Get current room status
   */
  getRoomStatus(): RoomStatus {
    return this.roomStatus;
  }

  /**
   * Add a player to the game
   */
  async joinPlayer(player: Player): Promise<ActionResult<Player>> {
    this.ensurePlayerManager();

    // Validate player can join
    const validationError = GameValidator.validatePlayerJoin(this.state, this.config, player);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
      };
    }

    try {
      // Add to player manager
      this.playerManager.addPlayer(player);

      // Update state
      this.state.players.push(player);

      // Call lifecycle hook
      await this.onPlayerJoin(player);

      // Emit event
      await this.emitEvent('player:joined', { player });

      // Sync state
      await this.syncState();

      return {
        success: true,
        data: player,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join player',
      };
    }
  }

  /**
   * Remove a player from the game
   */
  async leavePlayer(playerId: PlayerId): Promise<ActionResult<void>> {
    this.ensurePlayerManager();

    // Validate player exists
    const validationError = GameValidator.validatePlayerExists(this.state, playerId);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
      };
    }

    try {
      // Remove from player manager
      this.playerManager.removePlayer(playerId);

      // Update state
      this.state.players = this.state.players.filter((p) => p.id !== playerId);

      // Call lifecycle hook
      await this.onPlayerLeave(playerId);

      // Emit event
      await this.emitEvent('player:left', { playerId, reason: 'manual' });

      // Sync state
      await this.syncState();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove player',
      };
    }
  }

  /**
   * Mark player as disconnected (starts timeout timer)
   */
  async disconnectPlayer(playerId: PlayerId): Promise<ActionResult<void>> {
    this.ensurePlayerManager();

    // Validate player exists
    const validationError = GameValidator.validatePlayerExists(this.state, playerId);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
      };
    }

    try {
      const strategy = this.config.disconnectStrategy ?? 'reconnect-window';

      // Apply strategy-specific behavior before marking disconnected
      if (strategy === 'transfer-host') {
        this.transferHost(playerId);
      } else if (strategy === 'skip-turn') {
        this.handleSkipTurn(playerId);
      }

      // Mark as disconnected with timeout
      this.playerManager.disconnect(playerId, (id) => this.handlePlayerTimeout(id));

      // Update player connection status in state
      const player = this.state.players.find((p) => p.id === playerId);
      if (player) {
        player.isConnected = false;
      }

      // Emit event
      await this.emitEvent('player:disconnected', { playerId });

      // Sync state
      await this.syncState();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect player',
      };
    }
  }

  /**
   * Transfer host role to the next available player when the host disconnects.
   * Called before playerManager.disconnect() so the new host is still considered connected.
   */
  protected transferHost(disconnectedPlayerId: PlayerId): void {
    const disconnectingPlayer = this.state.players.find((p) => p.id === disconnectedPlayerId);
    if (!disconnectingPlayer?.isHost) {
      return; // Not the host — nothing to transfer
    }

    const nextHost = this.state.players.find(
      (p) => p.id !== disconnectedPlayerId && p.isConnected
    );
    if (!nextHost) {
      return; // No connected player to promote
    }

    disconnectingPlayer.isHost = false;
    nextHost.isHost = true;
  }

  /**
   * Advance currentTurnIndex to the next connected player when the current turn player disconnects.
   */
  private handleSkipTurn(disconnectedPlayerId: PlayerId): void {
    const { playerOrder, currentTurnIndex } = this.state;
    if (
      playerOrder == null ||
      currentTurnIndex == null ||
      playerOrder[currentTurnIndex] !== disconnectedPlayerId
    ) {
      return; // Not their turn — nothing to skip
    }

    const total = playerOrder.length;
    for (let i = 1; i < total; i++) {
      const nextIndex = (currentTurnIndex + i) % total;
      const nextPlayerId = playerOrder[nextIndex];
      const nextPlayer = this.state.players.find((p) => p.id === nextPlayerId);
      if (nextPlayer?.isConnected && nextPlayer.id !== disconnectedPlayerId) {
        this.state.currentTurnIndex = nextIndex;
        return;
      }
    }
  }

  /**
   * Reconnect a player (cancels timeout timer)
   */
  async reconnectPlayer(playerId: PlayerId): Promise<ActionResult<void>> {
    this.ensurePlayerManager();

    // Validate player exists
    const validationError = GameValidator.validatePlayerExists(this.state, playerId);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
      };
    }

    try {
      // Cancel timeout and mark as connected
      this.playerManager.reconnect(playerId);

      // Update player connection status in state
      const player = this.state.players.find((p) => p.id === playerId);
      if (player) {
        player.isConnected = true;
      }

      // Emit event
      await this.emitEvent('player:reconnected', { playerId });

      // Sync state to reconnected player
      if (this.synchronizer) {
        await this.synchronizer.sendToPlayer(playerId, this.state);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reconnect player',
      };
    }
  }

  /**
   * Start the game
   */
  async startGame(): Promise<ActionResult<void>> {
    // Validate game can start
    const validationError = GameValidator.validateGameStart(this.state, this.config);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
      };
    }

    try {
      // Update state
      const startedAt = Date.now();
      this.state.startedAt = startedAt;
      this.roomStatus = 'playing';

      // Call lifecycle hook
      const phaseBeforeStart = this.state.phase;
      await this.onGameStart();

      // Dev warning: onGameStart() returned without calling transitionPhase()
      if (process.env.NODE_ENV !== 'production' && this.state.phase === phaseBeforeStart) {
        console.warn(
          `[Bonfire] onGameStart() returned but the phase is still "${phaseBeforeStart}". ` +
          `Did you forget to call transitionPhase()? ` +
          `Valid phases are: [${this.config.phases.join(', ')}]`
        );
      }

      // Emit event
      await this.emitEvent('game:started', { startedAt });

      // Sync state
      await this.syncState();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start game',
      };
    }
  }

  /**
   * End the game
   */
  async endGame(): Promise<ActionResult<void>> {
    // Validate game can end
    const validationError = GameValidator.validateGameEnded(this.state);
    if (validationError) {
      return {
        success: false,
        error: validationError.message,
      };
    }

    try {
      // Update state
      const endedAt = Date.now();
      this.state.endedAt = endedAt;
      this.roomStatus = 'ended';

      // Call lifecycle hook
      await this.onGameEnd();

      // Emit event
      await this.emitEvent('game:ended', { endedAt });

      // Sync state
      await this.syncState();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end game',
      };
    }
  }

  /**
   * Close the room (cleanup)
   */
  async closeRoom(): Promise<ActionResult<void>> {
    try {
      // Cleanup timers if player manager was initialized
      if (this.playerManager) {
        this.playerManager.cleanup();
      }

      // Update status
      this.roomStatus = 'closed';

      // Emit event
      await this.emitEvent('room:closed', { roomId: this.roomId });

      // Remove all event listeners
      this.events.removeAllListeners();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close room',
      };
    }
  }

  /**
   * Transition to a new phase (overrides base class to add validation and events)
   */
  protected async transitionPhase(nextPhase: Phase): Promise<void> {
    // Validate transition
    const validationError = GameValidator.validatePhaseTransition(
      this.state.phase,
      nextPhase,
      this.config
    );
    if (validationError) {
      throw new ValidationError(validationError.message, validationError.code);
    }

    const transition: PhaseTransition = {
      from: this.state.phase,
      to: nextPhase,
      timestamp: Date.now(),
    };

    // Update state
    this.state.phase = nextPhase;

    // Call lifecycle hook
    await this.onPhaseChange(transition);

    // Emit event
    await this.emitEvent('phase:changed', transition);

    // Sync state
    await this.syncState();
  }

  /**
   * Broadcast a custom game-specific event to all connected clients.
   * Use this for game events that are not part of the framework lifecycle
   * (e.g. 'question_revealed', 'round_ended', 'score_updated').
   */
  protected async broadcastEvent(type: string, payload: unknown): Promise<void> {
    if (this.synchronizer) {
      await this.synchronizer.broadcastCustomEvent(type, payload);
    }
  }

  /**
   * Update state immutably
   */
  protected async updateState(updates: Partial<TState>): Promise<void> {
    this.state = StateManager.updateState(this.state, updates);
    await this.syncState();
  }

  /**
   * Emit event to local listeners and synchronizer
   */
  protected async emitEvent<K extends GameEventType>(
    event: K,
    payload: GameEventPayloads[K]
  ): Promise<void> {
    // Emit to local listeners
    await this.events.emit(event, payload);

    // Emit to synchronizer if available
    if (this.synchronizer) {
      await this.synchronizer.broadcastEvent(event, payload);
    }
  }

  /**
   * Sync current state to all clients
   */
  protected async syncState(): Promise<void> {
    if (this.synchronizer) {
      await this.synchronizer.broadcastState(this.state);
    }
  }

  /**
   * Handle player timeout (called when disconnect timer expires)
   */
  protected async handlePlayerTimeout(playerId: PlayerId): Promise<void> {
    this.ensurePlayerManager();

    // Remove from player manager
    this.playerManager.removePlayer(playerId);

    // Update state
    this.state.players = this.state.players.filter((p) => p.id !== playerId);

    // Call lifecycle hook
    await this.onPlayerLeave(playerId);

    // Emit event with timeout reason
    await this.emitEvent('player:left', { playerId, reason: 'timeout' });

    // Sync state
    await this.syncState();
  }
}
