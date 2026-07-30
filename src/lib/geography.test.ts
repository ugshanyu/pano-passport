import { describe, expect, it } from 'vitest'
import roundsData from '../data/rounds.json'
import type { Round } from '../types'
import { MAX_ROUND_SCORE } from './game'
import {
  createCountryOptions,
  distanceKm,
  formatDistance,
  scoreGuess,
} from './geography'

const rounds = roundsData as Round[]
const frenchRound = rounds.find(({ countryCode }) => countryCode === 'FR')!

describe('distance scoring', () => {
  it('calculates real-world great-circle distance', () => {
    const londonToParis = distanceKm(
      { latitude: 51.5074, longitude: -0.1278 },
      { latitude: 48.8566, longitude: 2.3522 },
    )
    expect(londonToParis).toBeCloseTo(344, -1)
  })

  it('awards full points for the correct country', () => {
    expect(scoreGuess('FR', frenchRound)).toEqual({
      distanceKm: 0,
      points: MAX_ROUND_SCORE,
    })
  })

  it('awards more partial points to a closer wrong country', () => {
    const nearby = scoreGuess('BE', frenchRound)
    const distant = scoreGuess('AU', frenchRound)
    expect(nearby.points).toBeGreaterThan(distant.points)
    expect(nearby.points).toBeLessThan(MAX_ROUND_SCORE)
    expect(nearby.distanceKm).toBeLessThan(distant.distanceKm)
  })

  it('formats distance feedback clearly', () => {
    expect(formatDistance(0)).toBe('Exact country')
    expect(formatDistance(843)).toBe('~840 km away')
  })
})

describe('country choices', () => {
  it('returns four deterministic unique choices including the answer', () => {
    const first = createCountryOptions(frenchRound, rounds)
    const second = createCountryOptions(frenchRound, rounds)
    expect(first).toEqual(second)
    expect(first).toHaveLength(4)
    expect(new Set(first.map(({ code }) => code)).size).toBe(4)
    expect(first.some(({ code }) => code === 'FR')).toBe(true)
  })
})
