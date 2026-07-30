import { describe, expect, it } from 'vitest'
import {
  applyMultiplayerAction,
  createMultiplayerState,
  everyoneGuessed,
  restoreMultiplayerState,
  type MultiplayerAction,
  type MultiplayerState,
} from './multiplayer'

function roomState(): MultiplayerState {
  return {
    ...createMultiplayerState(),
    enabled: true,
    phase: 'waiting',
    connection: 'connected',
    roomId: 'room-1',
    myId: 'host',
    hostId: 'host',
    expectedPlayerIds: ['host', 'guest'],
    presentIds: ['host', 'guest'],
  }
}

function action(
  playerId: string,
  actionType: string,
  actionData: Record<string, unknown>,
): MultiplayerAction {
  return {
    player_id: playerId,
    room_id: 'room-1',
    action_type: actionType,
    action_data: actionData,
  }
}

function startedState(roundCount: 5 | 10 | 15 = 5) {
  const start = action('host', 'pano:start', {
    matchId: 'match-1',
    roundCount,
    roundIds: Array.from({ length: roundCount }, (_, index) => `round-${index}`),
    playerIds: ['host', 'guest'],
  })
  return applyMultiplayerAction(roomState(), start)
}

describe('multiplayer reducer', () => {
  it.each([5, 10, 15] as const)(
    'starts a synchronized %i-round match from the host',
    (roundCount) => {
      const state = startedState(roundCount)
      expect(state.phase).toBe('playing')
      expect(state.roundCount).toBe(roundCount)
      expect(state.roundIds).toHaveLength(roundCount)
      expect(state.scores).toEqual({ host: 0, guest: 0 })
    },
  )

  it('rejects a start command from a guest', () => {
    const state = roomState()
    const next = applyMultiplayerAction(
      state,
      action('guest', 'pano:start', {
        matchId: 'match-1',
        roundCount: 5,
        roundIds: ['1', '2', '3', '4', '5'],
        playerIds: ['host', 'guest'],
      }),
    )
    expect(next).toBe(state)
  })

  it('locks one guess per player and waits for everyone', () => {
    let state = startedState()
    state = applyMultiplayerAction(
      state,
      action('host', 'pano:guess', {
        matchId: 'match-1',
        roundIndex: 0,
        countryCode: 'FR',
        countryName: 'France',
      }),
    )
    expect(everyoneGuessed(state)).toBe(false)

    state = applyMultiplayerAction(
      state,
      action('guest', 'pano:guess', {
        matchId: 'match-1',
        roundIndex: 0,
        countryCode: 'BE',
        countryName: 'Belgium',
      }),
    )
    expect(everyoneGuessed(state)).toBe(true)

    const duplicate = applyMultiplayerAction(
      state,
      action('guest', 'pano:guess', {
        matchId: 'match-1',
        roundIndex: 0,
        countryCode: 'FR',
        countryName: 'France',
      }),
    )
    expect(duplicate).toBe(state)
  })

  it('accepts only the host reveal and preserves round history', () => {
    const state = startedState()
    const outcomes = {
      host: {
        countryCode: 'FR',
        countryName: 'France',
        correct: true,
        distanceKm: 0,
        points: 1000,
      },
      guest: {
        countryCode: 'BE',
        countryName: 'Belgium',
        correct: false,
        distanceKm: 260,
        points: 730,
      },
    }
    const revealed = applyMultiplayerAction(
      state,
      action('host', 'pano:reveal', {
        matchId: 'match-1',
        roundIndex: 0,
        outcomes,
        scores: { host: 1000, guest: 730 },
      }),
    )
    expect(revealed.phase).toBe('revealed')
    expect(revealed.history[0]).toEqual(outcomes)
    expect(revealed.scores.guest).toBe(730)
  })

  it('restores match data without replacing local connection identity', () => {
    const snapshot = { ...startedState(), myId: 'host', connection: 'offline' }
    const guest = {
      ...roomState(),
      myId: 'guest',
      connection: 'reconnecting' as const,
    }
    const restored = restoreMultiplayerState(guest, snapshot)
    expect(restored.matchId).toBe('match-1')
    expect(restored.myId).toBe('guest')
    expect(restored.connection).toBe('reconnecting')
  })
})
