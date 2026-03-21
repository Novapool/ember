/**
 * Simple example game demonstrating SocialGame usage
 * This is a minimal quiz game to show the framework in action
 */

import {
  SocialGame,
  Player,
  PlayerAction,
  ActionResult,
  PhaseTransition,
  GameState,
  GameConfig,
} from '../src/index';

// Define custom game state
interface QuizGameState extends GameState {
  scores: Record<string, number>;
  currentQuestion?: string;
  answers: Record<string, string>;
}

// Create game by extending SocialGame
class SimpleQuizGame extends SocialGame<QuizGameState> {
  config: GameConfig = {
    minPlayers: 2,
    maxPlayers: 6,
    phases: ['lobby', 'question', 'results'],
    disconnectTimeout: 30000,
  };

  async onPlayerJoin(player: Player): Promise<void> {
    // Initialize player score
    this.state.scores[player.id] = 0;
    console.log(`${player.name} joined! (${this.getPlayers().length}/${this.config.maxPlayers})`);
  }

  async onPlayerLeave(playerId: string): Promise<void> {
    console.log(`Player ${playerId} left the game`);
    delete this.state.scores[playerId];
  }

  async onGameStart(): Promise<void> {
    console.log('Game starting!');
    await this.transitionPhase('question');
  }

  async onGameEnd(): Promise<void> {
    console.log('Game ended! Final scores:', this.state.scores);
  }

  async onPhaseChange(transition: PhaseTransition): Promise<void> {
    console.log(`Phase: ${transition.from} → ${transition.to}`);

    if (transition.to === 'question') {
      // Ask a question
      this.state.currentQuestion = 'What is 2+2?';
      this.state.answers = {};
    } else if (transition.to === 'results') {
      // Show results
      console.log('Answers:', this.state.answers);
    }
  }

  async handleAction(action: PlayerAction): Promise<ActionResult> {
    if (action.type === 'submit-answer') {
      const answer = action.payload as string;
      this.state.answers[action.playerId] = answer;

      // Check if correct
      if (answer === '4') {
        this.state.scores[action.playerId] += 10;
      }

      await this.updateState(this.state);
      return { success: true };
    }

    return { success: false, error: 'Unknown action' };
  }
}

// Example usage
async function runExample() {
  console.log('=== Simple Quiz Game Example ===\n');

  // Create game instance
  const game = new SimpleQuizGame('room-123', {
    roomId: 'room-123',
    phase: 'lobby',
    players: [],
    scores: {},
    answers: {},
  });

  // Listen to events
  game.on('player:joined', ({ player }) => {
    console.log(`📢 Event: ${player.name} joined!`);
  });

  game.on('game:started', () => {
    console.log('📢 Event: Game started!');
  });

  game.on('phase:changed', ({ from, to }) => {
    console.log(`📢 Event: Phase changed from ${from} to ${to}`);
  });

  // Add players
  console.log('\n--- Adding Players ---');
  await game.joinPlayer({
    id: 'alice',
    name: 'Alice',
    isHost: true,
    isConnected: true,
    joinedAt: Date.now(),
  });

  await game.joinPlayer({
    id: 'bob',
    name: 'Bob',
    isHost: false,
    isConnected: true,
    joinedAt: Date.now(),
  });

  // Check if can start
  console.log(`\nCan start? ${game.canStart()}`);

  // Start game
  console.log('\n--- Starting Game ---');
  await game.startGame();

  // Players submit answers
  console.log('\n--- Players Answer ---');
  await game.handleAction({
    playerId: 'alice',
    type: 'submit-answer',
    payload: '4',
    timestamp: Date.now(),
  });

  await game.handleAction({
    playerId: 'bob',
    type: 'submit-answer',
    payload: '5',
    timestamp: Date.now(),
  });

  // Show results
  console.log('\n--- Showing Results ---');
  await (game as any).transitionPhase('results');

  // End game
  console.log('\n--- Ending Game ---');
  await game.endGame();

  // Cleanup
  await game.closeRoom();

  console.log('\n=== Example Complete ===');
}

// Run if executed directly
runExample().catch(console.error);

export { SimpleQuizGame, runExample };
