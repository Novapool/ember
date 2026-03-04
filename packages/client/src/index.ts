// ---- Client ----
export { EmberClient } from './client/EmberClient';

// ---- Context ----
export { EmberProvider } from './context/EmberProvider';
export type { EmberProviderProps, EmberContextValue } from './context/EmberProvider';

// ---- Hooks ----
export { useGameState } from './hooks/useGameState';
export { useConnection } from './hooks/useConnection';
export { useRoom } from './hooks/useRoom';
export { usePlayer } from './hooks/usePlayer';
export { usePhase } from './hooks/usePhase';
export { useEmberEvent } from './hooks/useEmberEvent';
export { useTurn } from './hooks/useTurn';
export { useLobby } from './hooks/useLobby';
export type { UseLobbyOptions, UseLobbyReturn } from './hooks/useLobby';
export { useResponseInput } from './hooks/useResponseInput';
export type { UseResponseInputOptions, UseResponseInputReturn, RankingOps } from './hooks/useResponseInput';
export { useCountdown } from './hooks/useCountdown';
export { useSession } from './hooks/useSession';

// ---- Components ----
export { EmberErrorBoundary } from './components/EmberErrorBoundary';
export { Lobby } from './components/Lobby';
export type { LobbyProps } from './components/Lobby';
export { Timer } from './components/Timer';
export type { TimerProps } from './components/Timer';
export { PlayerAvatar } from './components/PlayerAvatar';
export type { PlayerAvatarProps } from './components/PlayerAvatar';
export { PromptCard } from './components/PromptCard';
export type { PromptCardProps, PromptVariant } from './components/PromptCard';
export { ResponseInput } from './components/ResponseInput';
export type { ResponseInputProps, InputConfig, TextInputConfig, MultipleChoiceConfig, RankingConfig, Choice } from './components/ResponseInput';
export { RevealPhase } from './components/RevealPhase';
export type { RevealPhaseProps, RevealItem } from './components/RevealPhase';
export { GameProgress } from './components/GameProgress';
export type { GameProgressProps, GameProgressVariant } from './components/GameProgress';
export { VotingInterface } from './components/VotingInterface';
export type { VotingInterfaceProps, VoteOption } from './components/VotingInterface';

// ---- Utils ----
export { getPlayerColor, getPlayerInitials } from './utils/colorHash';

// ---- Types ----
export type {
  EmberClientConfig,
  ConnectionStatus,
  BaseResponse,
  RoomCreateResponse,
  RoomJoinResponse,
  StateResponse,
  ActionResponse,
  ErrorResponse,
  EmberGameEvent,
} from './types';
