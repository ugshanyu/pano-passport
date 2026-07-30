export type LeaderboardEntry = {
  user_id: string
  name?: string | null
  avatar?: string | null
  score: number
  rank: number
  is_me: boolean
}

type LeaderboardMe = {
  score: number | null
  rank: number | null
  total: number
}

type LeaderboardSubmit = {
  success: boolean
  score: number
  best: number
  rank: number
  updated: boolean
}

type UsionSdk = {
  init: (options?: { timeout?: number }) => Promise<Record<string, unknown>>
  leaderboard: {
    submit: (score: number, metadata?: Record<string, unknown>) => Promise<LeaderboardSubmit>
    friends: (options?: { limit?: number }) => Promise<LeaderboardEntry[]>
    top: (options?: { limit?: number }) => Promise<LeaderboardEntry[]>
    me: () => Promise<LeaderboardMe>
  }
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
    Usion?: UsionSdk
  }
}

export function hasUsionHost() {
  return Boolean(window.ReactNativeWebView || window.parent !== window)
}

function sdk() {
  if (!window.Usion) {
    throw new Error('The Usion SDK did not load.')
  }
  return window.Usion
}

export async function initUsion() {
  await sdk().init({ timeout: 12_000 })
}

export async function getUsionBestScore() {
  const record = await sdk().leaderboard.me()
  return record.score ?? 0
}

export async function syncUsionLeaderboard(score: number, correct: number) {
  const submission = await sdk().leaderboard.submit(score, {
    correct,
    rounds: 5,
  })
  const [friends, worldwide] = await Promise.all([
    sdk().leaderboard.friends({ limit: 20 }),
    sdk().leaderboard.top({ limit: 10 }),
  ])

  return {
    best: Number.isFinite(submission.best) ? submission.best : score,
    friends: Array.isArray(friends) ? friends : [],
    worldwide: Array.isArray(worldwide) ? worldwide : [],
  }
}
