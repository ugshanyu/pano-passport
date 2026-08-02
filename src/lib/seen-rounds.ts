import type { Round } from '../types'

const SEEN_KEY_PREFIX = 'pano-passport-seen'
const ANONYMOUS_ID = 'local'

export function seenStorageKey(userId?: string | null) {
  return `${SEEN_KEY_PREFIX}:${userId?.trim() || ANONYMOUS_ID}`
}

export function loadSeen(userId?: string | null): string[] {
  try {
    const raw = window.localStorage.getItem(seenStorageKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveSeen(userId: string | null | undefined, ids: string[]) {
  try {
    window.localStorage.setItem(seenStorageKey(userId), JSON.stringify(ids))
  } catch {
  }
}

export function markSeen(userId: string | null | undefined, ids: string[]) {
  const merged = new Set(loadSeen(userId))
  for (const id of ids) merged.add(id)
  const next = [...merged]
  saveSeen(userId, next)
  return next
}

export function resetSeen(userId?: string | null) {
  saveSeen(userId, [])
}

export function unseenRounds(rounds: Round[], seenLists: string[][]) {
  const seen = new Set(seenLists.flat())
  return rounds.filter((round) => !seen.has(round.id))
}

export function seenProgress(rounds: Round[], seenLists: string[][]) {
  const remaining = unseenRounds(rounds, seenLists).length
  return { total: rounds.length, remaining, played: rounds.length - remaining }
}

function shuffled(rounds: Round[], random: () => number) {
  const copy = [...rounds]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}

export type UnseenSelection = {
  rounds: Round[]
  cycled: boolean
}

export function selectUnseenRounds(
  rounds: Round[],
  count: number,
  seenLists: string[][],
  random: () => number = Math.random,
): UnseenSelection {
  const wanted = Math.min(count, rounds.length)
  const fresh = shuffled(unseenRounds(rounds, seenLists), random)

  if (fresh.length >= wanted) {
    return { rounds: fresh.slice(0, wanted), cycled: false }
  }

  const picked = [...fresh]
  const used = new Set(picked.map((round) => round.id))
  const recycled = shuffled(
    rounds.filter((round) => !used.has(round.id)),
    random,
  )
  picked.push(...recycled.slice(0, wanted - picked.length))
  return { rounds: picked, cycled: true }
}

export function seenAfterSelection(
  previousSeen: string[],
  selection: UnseenSelection,
) {
  const dealt = selection.rounds.map((round) => round.id)
  if (selection.cycled) return [...new Set(dealt)]
  return [...new Set([...previousSeen, ...dealt])]
}
