/**
 * Validation utilities for game operations
 */

import type { GameState, GameConfig, Player, Phase, ValidationErrorDetails } from '../types';
import { createValidationError } from './errors';

/**
 * Centralized game validation logic
 */
export class GameValidator {
  /**
   * Validate if a player can join the game
   */
  static validatePlayerJoin(
    state: GameState,
    config: GameConfig,
    player: Player
  ): ValidationErrorDetails | null {
    // Check if player already exists
    if (state.players.some((p) => p.id === player.id)) {
      return createValidationError(
        'PLAYER_ALREADY_JOINED',
        `Player ${player.id} has already joined`,
        { playerId: player.id }
      );
    }

    // Check max players
    if (state.players.length >= config.maxPlayers) {
      return createValidationError(
        'GAME_FULL',
        `Game is full (max ${config.maxPlayers} players)`,
        { maxPlayers: config.maxPlayers, currentPlayers: state.players.length }
      );
    }

    // Check if game is in progress and joining is not allowed
    if (state.startedAt && !config.allowJoinInProgress) {
      return createValidationError(
        'GAME_IN_PROGRESS',
        'Cannot join game in progress',
        { startedAt: state.startedAt }
      );
    }

    return null;
  }

  /**
   * Validate if the game can start
   */
  static validateGameStart(state: GameState, config: GameConfig): ValidationErrorDetails | null {
    // Check if game already started
    if (state.startedAt) {
      return createValidationError(
        'GAME_ALREADY_STARTED',
        'Game has already started',
        { startedAt: state.startedAt }
      );
    }

    // Check minimum players
    if (state.players.length < config.minPlayers) {
      return createValidationError(
        'NOT_ENOUGH_PLAYERS',
        `Need at least ${config.minPlayers} players to start`,
        { minPlayers: config.minPlayers, currentPlayers: state.players.length }
      );
    }

    return null;
  }

  /**
   * Validate phase transition
   */
  static validatePhaseTransition(
    currentPhase: Phase,
    nextPhase: Phase,
    config: GameConfig
  ): ValidationErrorDetails | null {
    // Check if next phase exists in config
    if (!config.phases.includes(nextPhase)) {
      return createValidationError(
        'INVALID_PHASE',
        `Phase "${nextPhase}" is not defined in game config. Valid phases are: [${config.phases.join(', ')}]`,
        { validPhases: config.phases, requestedPhase: nextPhase }
      );
    }

    // Check if transitioning to same phase
    if (currentPhase === nextPhase) {
      return createValidationError(
        'SAME_PHASE',
        `Already in phase "${currentPhase}"`,
        { currentPhase }
      );
    }

    // Check if phase progression is valid (must move forward in phases array)
    const currentIndex = config.phases.indexOf(currentPhase);
    const nextIndex = config.phases.indexOf(nextPhase);

    if (currentIndex === -1) {
      return createValidationError(
        'INVALID_CURRENT_PHASE',
        `Current phase "${currentPhase}" is not defined in game config`,
        { validPhases: config.phases, currentPhase }
      );
    }

    // Allow backward transitions but warn if skipping phases
    if (nextIndex < currentIndex) {
      // Backward transition is allowed but unusual
      return null;
    }

    return null;
  }

  /**
   * Validate player exists in game
   */
  static validatePlayerExists(state: GameState, playerId: string): ValidationErrorDetails | null {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return createValidationError('PLAYER_NOT_FOUND', `Player ${playerId} not found in game`, {
        playerId,
      });
    }
    return null;
  }

  /**
   * Validate game has ended
   */
  static validateGameEnded(state: GameState): ValidationErrorDetails | null {
    if (state.endedAt) {
      return createValidationError('GAME_ALREADY_ENDED', 'Game has already ended', {
        endedAt: state.endedAt,
      });
    }
    if (!state.startedAt) {
      return createValidationError('GAME_NOT_STARTED', 'Game has not started yet');
    }
    return null;
  }
}
