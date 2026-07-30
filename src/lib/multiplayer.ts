import type { RoundCount } from './game'
import type { MultiplayerPlayer } from '../types'

export const MULTIPLAYER_SCHEMA = 'pano-passport-multiplayer-v1'

export type MultiplayerGuess = {
  countryCode: string
  countryName: string
}

export type MultiplayerOutcome = MultiplayerGuess & {
  correct: boolean
  distanceKm: number
  points: number
}

export type MultiplayerPhase =
  | 'inactive'
  | 'connecting'
  | 'waiting'
  | 'playing'
  | 'revealed'
  | 'finished'
  | 'error'

export type MultiplayerState = {
  schema: typeof MULTIPLAYER_SCHEMA
  enabled: boolean
  phase: MultiplayerPhase
  connection: 'offline' | 'connecting' | 'connected' | 'reconnecting'
  error: string | null
  roomId: string | null
  myId: string | null
  hostId: string | null
  expectedPlayerIds: string[]
  presentIds: string[]
  activePlayerIds: string[]
  players: Record<string, MultiplayerPlayer>
  matchId: string | null
  roundCount: RoundCount
  roundIds: string[]
  roundIndex: number
  guesses: Record<string, MultiplayerGuess>
  outcomes: Record<string, MultiplayerOutcome>
  history: Record<number, Record<string, MultiplayerOutcome>>
  scores: Record<string, number>
  standings: string[]
}

export type MultiplayerAction = {
  player_id: string
  action_type: string
  action_data: Record<string, unknown>
  sequence?: number
}

export function createMultiplayerState(): MultiplayerState {
  return {
    schema: MULTIPLAYER_SCHEMA,
    enabled: false,
    phase: 'inactive',
    connection: 'offline',
    error: null,
    roomId: null,
    myId: null,
    hostId: null,
    expectedPlayerIds: [],
    presentIds: [],
    activePlayerIds: [],
    players: {},
    matchId: null,
    roundCount: 5,
    roundIds: [],
    roundIndex: 0,
    guesses: {},
    outcomes: {},
    history: {},
    scores: {},
    standings: [],
  }
}

function isRoundCount(value: unknown): value is RoundCount {
  return value === 5 || value === 10 || value === 15
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function isCurrentMatch(state: MultiplayerState, data: Record<string, unknown>) {
  return typeof data.matchId === 'string' && data.matchId === state.matchId
}

export function applyMultiplayerAction(
  state: MultiplayerState,
  message: MultiplayerAction,
): MultiplayerState {
  const data = message.action_data

  if (message.action_type === 'pano:start') {
    const roundCount = data.roundCount
    const roundIds = stringArray(data.roundIds)
    const activePlayerIds = stringArray(data.playerIds)
    if (
      typeof data.matchId !== 'string' ||
      !isRoundCount(roundCount) ||
      roundIds.length !== roundCount ||
      activePlayerIds.length < 2 ||
      message.player_id !== state.hostId
    ) {
      return state
    }
    return {
      ...state,
      phase: 'playing',
      error: null,
      matchId: data.matchId,
      roundCount,
      roundIds,
      roundIndex: 0,
      activePlayerIds,
      guesses: {},
      outcomes: {},
      history: {},
      scores: Object.fromEntries(activePlayerIds.map((id) => [id, 0])),
      standings: [],
    }
  }

  if (message.action_type === 'pano:guess' && isCurrentMatch(state, data)) {
    if (
      state.phase !== 'playing' ||
      data.roundIndex !== state.roundIndex ||
      !state.activePlayerIds.includes(message.player_id) ||
      state.guesses[message.player_id] ||
      typeof data.countryCode !== 'string' ||
      typeof data.countryName !== 'string'
    ) {
      return state
    }
    return {
      ...state,
      guesses: {
        ...state.guesses,
        [message.player_id]: {
          countryCode: data.countryCode,
          countryName: data.countryName,
        },
      },
    }
  }

  if (message.action_type === 'pano:reveal' && isCurrentMatch(state, data)) {
    if (
      message.player_id !== state.hostId ||
      data.roundIndex !== state.roundIndex ||
      typeof data.outcomes !== 'object' ||
      data.outcomes === null ||
      typeof data.scores !== 'object' ||
      data.scores === null
    ) {
      return state
    }
    const outcomes = data.outcomes as Record<string, MultiplayerOutcome>
    return {
      ...state,
      phase: 'revealed',
      outcomes,
      history: { ...state.history, [state.roundIndex]: outcomes },
      scores: data.scores as Record<string, number>,
    }
  }

  if (message.action_type === 'pano:next' && isCurrentMatch(state, data)) {
    const roundIndex = Number(data.roundIndex)
    if (
      message.player_id !== state.hostId ||
      state.phase !== 'revealed' ||
      roundIndex !== state.roundIndex + 1 ||
      roundIndex >= state.roundCount
    ) {
      return state
    }
    return {
      ...state,
      phase: 'playing',
      roundIndex,
      guesses: {},
      outcomes: {},
    }
  }

  if (message.action_type === 'pano:finish' && isCurrentMatch(state, data)) {
    if (
      message.player_id !== state.hostId ||
      state.phase !== 'revealed' ||
      !Array.isArray(data.standings)
    ) {
      return state
    }
    return {
      ...state,
      phase: 'finished',
      standings: stringArray(data.standings),
    }
  }

  if (message.action_type === 'pano:reset' && message.player_id === state.hostId) {
    return {
      ...state,
      phase: 'waiting',
      matchId: null,
      roundIds: [],
      roundIndex: 0,
      activePlayerIds: [],
      guesses: {},
      outcomes: {},
      history: {},
      scores: {},
      standings: [],
    }
  }

  return state
}

export function restoreMultiplayerState(
  current: MultiplayerState,
  snapshot: unknown,
) {
  if (
    typeof snapshot !== 'object' ||
    snapshot === null ||
    (snapshot as { schema?: unknown }).schema !== MULTIPLAYER_SCHEMA
  ) {
    return current
  }
  const restored = snapshot as MultiplayerState
  return {
    ...restored,
    enabled: true,
    connection: current.connection,
    roomId: current.roomId,
    myId: current.myId,
    players: { ...restored.players, ...current.players },
    presentIds: current.presentIds,
    error: null,
  }
}

export function everyoneGuessed(state: MultiplayerState) {
  return (
    state.phase === 'playing' &&
    state.activePlayerIds.length >= 1 &&
    state.activePlayerIds.every((id) => state.guesses[id])
  )
}

export function orderedPlayers(ids: string[], hostId: string | null) {
  if (!hostId || !ids.includes(hostId)) return [...ids]
  return [hostId, ...ids.filter((id) => id !== hostId)]
}
