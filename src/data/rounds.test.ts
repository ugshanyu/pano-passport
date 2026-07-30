import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import roundsData from './rounds.json'
import type { Round } from '../types'

const rounds = roundsData as Round[]

describe('panorama catalog', () => {
  it('contains exactly 200 unique, attributed locations', () => {
    expect(rounds).toHaveLength(200)
    expect(new Set(rounds.map(({ id }) => id))).toHaveLength(200)
    expect(new Set(rounds.map(({ sourceUrl }) => sourceUrl))).toHaveLength(200)
    expect(
      rounds.every(
        ({ countryCode, photographer, licenseUrl }) =>
          countryCode.length === 2 && photographer && licenseUrl.startsWith('https://'),
      ),
    ).toBe(true)
  })

  it('contains no known indoor panoramas', () => {
    const text = rounds
      .map(({ id, landmark, sourceUrl }) => `${id} ${landmark} ${sourceUrl}`)
      .join(' ')
      .toLowerCase()
    expect(text).not.toMatch(/\b(interior|exhibition|indoor)\b/)
  })

  it('stores a durable local preview for every Mapillary round', () => {
    for (const round of rounds) {
      if (round.provider !== 'mapillary') continue
      expect(
        existsSync(resolve(process.cwd(), 'public', round.previewUrl.slice(1))),
      ).toBe(true)
    }
  })
})
