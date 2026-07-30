import { useRef, useState } from 'react'
import type { Round, MultiplayerStanding } from '../types'
import type { RoundCount } from '../lib/game'
import { selectRounds } from '../lib/game'
import { scoreGuess } from '../lib/geography'
import {
  applyMultiplayerAction,
  createMultiplayerState,
  everyoneGuessed,
  orderedPlayers,
  type MultiplayerAction,
  type MultiplayerOutcome,
  type MultiplayerState,
} from '../lib/multiplayer'
import { createMultiplayerRoomHandlers } from '../lib/multiplayer-room-handlers'
import {
  getUsionGame,
  reportUsionMatchResult,
} from '../lib/usion'
import { useUsionRoomEvents } from './useUsionRoomEvents'

function matchId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function sortStandings(ids: string[], scores: Record<string, number>) {
  return [...ids].sort(
    (left, right) => (scores[right] ?? 0) - (scores[left] ?? 0),
  )
}

export function useUsionMultiplayer({
  embedded,
  catalog,
}: {
  embedded: boolean
  catalog: Round[]
}) {
  const [state, setState] = useState(createMultiplayerState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const stateRef = useRef(state)
  const revealPendingRef = useRef<string | null>(null)
  const reportedMatchRef = useRef<string | null>(null)
  const roundsByIdRef = useRef(
    new Map(catalog.map((round) => [round.id, round])),
  )

  const commit = (next: MultiplayerState) => {
    stateRef.current = next
    setState(next)
    return next
  }

  const checkpoint = (next: MultiplayerState) => {
    if (next.myId !== next.hostId) return
    void getUsionGame()
      .setState(next as unknown as Record<string, unknown>)
      .catch(() => {})
  }

  const revealIfReady = (next: MultiplayerState) => {
    if (next.myId !== next.hostId || !everyoneGuessed(next)) return
    const pendingKey = `${next.matchId}:${next.roundIndex}`
    if (revealPendingRef.current === pendingKey) return
    const round = roundsByIdRef.current.get(next.roundIds[next.roundIndex])
    if (!round) return

    revealPendingRef.current = pendingKey
    const outcomes: Record<string, MultiplayerOutcome> = {}
    const scores = { ...next.scores }
    for (const playerId of next.activePlayerIds) {
      const guess = next.guesses[playerId]
      if (!guess) return
      const scored = scoreGuess(guess.countryCode, round)
      outcomes[playerId] = {
        ...guess,
        ...scored,
        correct:
          guess.countryCode.toUpperCase() === round.countryCode.toUpperCase(),
      }
      scores[playerId] = (scores[playerId] ?? 0) + scored.points
    }
    void getUsionGame()
      .action('pano:reveal', {
        matchId: next.matchId,
        roundIndex: next.roundIndex,
        outcomes,
        scores,
      })
      .catch(() => {
        revealPendingRef.current = null
        window.setTimeout(() => revealIfReady(stateRef.current), 140)
      })
  }

  const applyAction = (message: MultiplayerAction) => {
    const previous = stateRef.current
    const next = applyMultiplayerAction(previous, message)
    if (next === previous) return next
    commit(next)
    if (next.myId && next.guesses[next.myId]) setIsSubmitting(false)

    if (next.myId === next.hostId) {
      if (
        ['pano:start', 'pano:reveal', 'pano:next', 'pano:finish', 'pano:reset']
          .includes(message.action_type)
      ) {
        checkpoint(next)
      }
      if (message.action_type === 'pano:guess') revealIfReady(next)
      if (
        message.action_type === 'pano:finish' &&
        next.matchId &&
        reportedMatchRef.current !== next.matchId
      ) {
        reportedMatchRef.current = next.matchId
        void reportUsionMatchResult({
          matchId: next.matchId,
          scores: next.scores,
          standings: next.standings,
        }).catch(() => {})
      }
    }
    return next
  }

  useUsionRoomEvents(
    embedded,
    createMultiplayerRoomHandlers({
      current: () => stateRef.current,
      commit,
      revealIfReady,
      applyAction,
    }),
  )

  const startMatch = async (roundCount: RoundCount) => {
    const current = stateRef.current
    if (
      current.myId !== current.hostId ||
      current.presentIds.length < 2 ||
      current.connection !== 'connected'
    ) {
      return
    }
    const roundIds = selectRounds(catalog, roundCount).map(({ id }) => id)
    revealPendingRef.current = null
    reportedMatchRef.current = null
    try {
      await getUsionGame().action('pano:start', {
        matchId: matchId(),
        roundCount,
        roundIds,
        playerIds: orderedPlayers(current.presentIds, current.hostId),
      })
    } catch {
      // The setup remains usable so the host can retry after reconnecting.
    }
  }

  const submitGuess = async (countryCode: string, countryName: string) => {
    const current = stateRef.current
    if (!current.matchId || isSubmitting || current.phase !== 'playing') return
    setIsSubmitting(true)
    try {
      await getUsionGame().action(
        'pano:guess',
        {
          matchId: current.matchId,
          roundIndex: current.roundIndex,
          countryCode,
          countryName,
        },
        { queueOffline: true },
      )
    } catch {
      setIsSubmitting(false)
    }
  }

  const continueMatch = async () => {
    const current = stateRef.current
    if (
      current.myId !== current.hostId ||
      !current.matchId ||
      current.phase !== 'revealed'
    ) {
      return
    }
    revealPendingRef.current = null
    if (current.roundIndex === current.roundCount - 1) {
      await getUsionGame()
        .action('pano:finish', {
          matchId: current.matchId,
          standings: sortStandings(current.activePlayerIds, current.scores),
        })
        .catch(() => {})
      return
    }
    await getUsionGame()
      .action('pano:next', {
        matchId: current.matchId,
        roundIndex: current.roundIndex + 1,
      })
      .catch(() => {})
  }

  const resetMatch = async () => {
    if (stateRef.current.myId !== stateRef.current.hostId) return
    await getUsionGame()
      .action('pano:reset', { matchId: stateRef.current.matchId })
      .catch(() => {})
  }

  const standings: MultiplayerStanding[] = (
    state.standings.length ? state.standings : state.activePlayerIds
  ).map((id) => ({
    id,
    name: state.players[id]?.name ?? (id === state.myId ? 'You' : 'Explorer'),
    avatar: state.players[id]?.avatar,
    score: state.scores[id] ?? 0,
  }))

  const allExpectedPresent =
    state.expectedPlayerIds.length <= 1 ||
    state.expectedPlayerIds.every((id) => state.presentIds.includes(id))

  return {
    state,
    standings,
    isHost: state.myId === state.hostId,
    canStart:
      state.connection === 'connected' &&
      state.presentIds.length >= 2 &&
      allExpectedPresent,
    hasGuessed: Boolean(state.myId && state.guesses[state.myId]),
    isSubmitting,
    startMatch,
    submitGuess,
    continueMatch,
    resetMatch,
  }
}
