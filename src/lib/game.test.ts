import { describe, expect, it } from 'vitest'
import {
  maxGameScore,
  panoramaVerticalAngle,
  roundPreviewUrl,
  selectRounds,
} from './game'
import type { Round } from '../types'

describe('panoramaVerticalAngle', () => {
  it('recognizes a full 2:1 photosphere', () => {
    expect(panoramaVerticalAngle(6000, 3000)).toBe(180)
  })

  it('supports partial-height cylindrical panoramas', () => {
    expect(panoramaVerticalAngle(10_800, 896)).toBeCloseTo(29.87, 1)
  })
})

describe('selectRounds', () => {
  const rounds = Array.from({ length: 8 }, (_, index) => ({
    id: String(index),
  })) as Round[]

  it('returns unique rounds without mutating the source', () => {
    const selected = selectRounds(rounds, 5, () => 0.4)
    expect(new Set(selected.map((round) => round.id)).size).toBe(5)
    expect(rounds.map((round) => round.id)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7'])
  })

  it.each([5, 10, 15])('supports a %i-round trip', (count) => {
    expect(selectRounds(rounds, count, () => 0.4)).toHaveLength(
      Math.min(count, rounds.length),
    )
    expect(maxGameScore(count)).toBe(count * 1000)
  })
})

describe('roundPreviewUrl', () => {
  it('requests a lighter Wikimedia preview', () => {
    expect(
      roundPreviewUrl({
        provider: 'wikimedia',
        panoramaUrl: 'https://upload.wikimedia.org/x/3840px-photo.jpg',
      } as Round),
    ).toBe('https://upload.wikimedia.org/x/960px-photo.jpg')
  })

  it('uses a Mapillary catalog preview', () => {
    expect(
      roundPreviewUrl({
        provider: 'mapillary',
        previewUrl: '/previews/mapillary/photo.jpg',
      } as Round),
    ).toBe('/previews/mapillary/photo.jpg')
  })
})
