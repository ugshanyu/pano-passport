import type { Round } from '../types'

export const ROUND_OPTIONS = [5, 10, 15] as const
export type RoundCount = (typeof ROUND_OPTIONS)[number]
export const DEFAULT_ROUND_COUNT: RoundCount = 5
export const MAX_ROUND_SCORE = 1000

export function maxGameScore(roundCount: number) {
  return roundCount * MAX_ROUND_SCORE
}

export function scoreForCountry(guessCode: string, answerCode: string) {
  return guessCode.toUpperCase() === answerCode.toUpperCase()
    ? MAX_ROUND_SCORE
    : 0
}

export function selectRounds(
  rounds: Round[],
  count = DEFAULT_ROUND_COUNT,
  random: () => number = Math.random,
) {
  const shuffled = [...rounds]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function panoramaVerticalAngle(width: number, height: number) {
  return Math.min(180, (height / width) * 360)
}

export function roundPreviewUrl(round: Round) {
  if (round.provider === 'mapillary') return round.previewUrl
  return round.panoramaUrl.replace('/3840px-', '/960px-')
}
