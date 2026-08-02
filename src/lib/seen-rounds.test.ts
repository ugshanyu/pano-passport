import { beforeEach, describe, expect, it } from 'vitest'
import {
  loadSeen,
  markSeen,
  resetSeen,
  seenAfterSelection,
  seenProgress,
  seenStorageKey,
  selectUnseenRounds,
  unseenRounds,
} from './seen-rounds'
import type { Round } from '../types'

const store = new Map<string, string>()
const localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
}
;(globalThis as { window?: unknown }).window = { localStorage }

const catalog = Array.from({ length: 10 }, (_, index) => ({
  id: String(index),
})) as Round[]

const ids = (rounds: Round[]) => rounds.map((round) => round.id)

describe('seenStorageKey', () => {
  it('separates players by Usion id', () => {
    expect(seenStorageKey('usion-a')).not.toBe(seenStorageKey('usion-b'))
  })

  it('falls back to one bucket outside a Usion host', () => {
    expect(seenStorageKey(null)).toBe(seenStorageKey(undefined))
    expect(seenStorageKey('   ')).toBe(seenStorageKey(null))
  })
})

describe('storage', () => {
  beforeEach(() => store.clear())

  it('round-trips a player history', () => {
    markSeen('u1', ['a', 'b'])
    markSeen('u1', ['b', 'c'])
    expect(loadSeen('u1').sort()).toEqual(['a', 'b', 'c'])
  })

  it('keeps players independent', () => {
    markSeen('u1', ['a'])
    expect(loadSeen('u2')).toEqual([])
  })

  it('clears on reset', () => {
    markSeen('u1', ['a'])
    resetSeen('u1')
    expect(loadSeen('u1')).toEqual([])
  })

  it('survives unreadable storage', () => {
    localStorage.setItem(seenStorageKey('u1'), 'not json')
    expect(loadSeen('u1')).toEqual([])
  })
})

describe('unseenRounds', () => {
  it('excludes rounds any listed player has seen', () => {
    expect(ids(unseenRounds(catalog, [['0', '1'], ['1', '2']]))).toEqual([
      '3', '4', '5', '6', '7', '8', '9',
    ])
  })

  it('returns everything for a fresh player', () => {
    expect(unseenRounds(catalog, [[]])).toHaveLength(10)
  })
})

describe('selectUnseenRounds', () => {
  it('never repeats a round the player has already seen', () => {
    const seen = ['0', '1', '2']
    const { rounds, cycled } = selectUnseenRounds(catalog, 5, [seen], () => 0.4)
    expect(cycled).toBe(false)
    expect(rounds).toHaveLength(5)
    expect(ids(rounds).some((id) => seen.includes(id))).toBe(false)
  })

  it('deals rounds no player in a match has seen', () => {
    const host = ['0', '1', '2', '3']
    const guest = ['3', '4', '5']
    const { rounds } = selectUnseenRounds(catalog, 3, [host, guest], () => 0.4)
    expect(ids(rounds).some((id) => [...host, ...guest].includes(id))).toBe(false)
  })

  it('recycles once the catalog is exhausted', () => {
    const everything = ids(catalog)
    const { rounds, cycled } = selectUnseenRounds(catalog, 4, [everything], () => 0.4)
    expect(cycled).toBe(true)
    expect(rounds).toHaveLength(4)
  })

  it('has no duplicates in a game that straddles the reset', () => {
    const seen = ids(catalog).slice(0, 8)
    const { rounds, cycled } = selectUnseenRounds(catalog, 5, [seen], () => 0.4)
    expect(cycled).toBe(true)
    expect(rounds).toHaveLength(5)
    expect(new Set(ids(rounds)).size).toBe(5)
    expect(ids(rounds).slice(0, 2).sort()).toEqual(['8', '9'])
  })

  it('never asks for more rounds than the catalog holds', () => {
    expect(selectUnseenRounds(catalog, 50, [[]], () => 0.4).rounds).toHaveLength(10)
  })
})

describe('seenAfterSelection', () => {
  it('appends when the cycle continues', () => {
    const selection = selectUnseenRounds(catalog, 3, [['0']], () => 0.4)
    expect(seenAfterSelection(['0'], selection)).toHaveLength(4)
  })

  it('restarts the history from the new cycle only', () => {
    const everything = ids(catalog)
    const selection = selectUnseenRounds(catalog, 3, [everything], () => 0.4)
    expect(seenAfterSelection(everything, selection).sort()).toEqual(
      ids(selection.rounds).sort(),
    )
  })
})

describe('seenProgress', () => {
  it('reports how much of the catalog is left', () => {
    expect(seenProgress(catalog, [['0', '1']])).toEqual({
      total: 10,
      played: 2,
      remaining: 8,
    })
  })
})

describe('full catalog cycle', () => {
  it('shows all 200 rounds before repeating any', () => {
    const catalog200 = Array.from({ length: 200 }, (_, i) => ({
      id: `r${i}`,
    })) as Round[]
    let seen: string[] = []
    const dealt: string[] = []

    for (let game = 0; game < 40; game += 1) {
      const selection = selectUnseenRounds(catalog200, 5, [seen])
      expect(selection.cycled).toBe(false)
      dealt.push(...ids(selection.rounds))
      seen = seenAfterSelection(seen, selection)
    }

    expect(dealt).toHaveLength(200)
    expect(new Set(dealt).size).toBe(200)
    expect(seenProgress(catalog200, [seen]).remaining).toBe(0)

    const after = selectUnseenRounds(catalog200, 5, [seen])
    expect(after.cycled).toBe(true)
    expect(after.rounds).toHaveLength(5)
    expect(seenAfterSelection(seen, after)).toHaveLength(5)
  })

  it('keeps a two-player match clear of both histories for a full cycle', () => {
    const catalog200 = Array.from({ length: 200 }, (_, i) => ({
      id: `r${i}`,
    })) as Round[]
    let host = ['r0', 'r1', 'r2', 'r3', 'r4']
    let guest = ['r3', 'r4', 'r5', 'r6']

    for (let match = 0; match < 5; match += 1) {
      const selection = selectUnseenRounds(catalog200, 10, [host, guest])
      const dealtIds = ids(selection.rounds)
      expect(dealtIds.some((id) => host.includes(id))).toBe(false)
      expect(dealtIds.some((id) => guest.includes(id))).toBe(false)
      host = seenAfterSelection(host, selection)
      guest = seenAfterSelection(guest, selection)
    }
  })
})
