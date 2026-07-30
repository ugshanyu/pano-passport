import type { MultiplayerOutcome } from './multiplayer'
import type { Round, RoundResult } from '../types'

export function outcomeToRoundResult(
  round: Round,
  outcome: MultiplayerOutcome,
): RoundResult {
  return {
    round,
    guessedCountry: outcome.countryName,
    guessedCountryCode: outcome.countryCode,
    correct: outcome.correct,
    distanceKm: outcome.distanceKm,
    points: outcome.points,
  }
}

export function buildMultiplayerResults(
  rounds: Round[],
  history: Record<number, Record<string, MultiplayerOutcome>>,
  myId: string | null,
) {
  if (!myId) return []
  return rounds.flatMap((round, index) => {
    const outcome = history[index]?.[myId]
    return outcome ? [outcomeToRoundResult(round, outcome)] : []
  })
}
