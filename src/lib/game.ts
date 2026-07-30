import type { Round } from '../types'

export const ROUND_COUNT = 5
export const MAX_ROUND_SCORE = 1000
export const MAX_GAME_SCORE = ROUND_COUNT * MAX_ROUND_SCORE

export function scoreForCountry(guessCode: string, answerCode: string) {
  return guessCode.toUpperCase() === answerCode.toUpperCase()
    ? MAX_ROUND_SCORE
    : 0
}

export function selectRounds(
  rounds: Round[],
  count = ROUND_COUNT,
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

export function previewUrl(panoramaUrl: string) {
  return panoramaUrl.replace('/3840px-', '/960px-')
}
