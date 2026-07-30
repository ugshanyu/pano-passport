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

export type UsionConfig = {
  userId?: string
  userName?: string
  userAvatar?: string | null
  roomId?: string | null
  playerIds?: string[]
  mode?: 'single' | 'multiplayer'
  serviceId?: string
}

export type UsionGameMessage = {
  room_id: string
  player_id: string
  action_type: string
  action_data: Record<string, unknown>
  sequence?: number
}

type UsionGame = {
  connect: () => Promise<void>
  join: (roomId?: string) => Promise<Record<string, unknown>>
  action: (
    actionType: string,
    actionData?: Record<string, unknown>,
    options?: { queueOffline?: boolean },
  ) => Promise<Record<string, unknown>>
  realtime: (actionType: string, actionData?: Record<string, unknown>) => void
  setState: (state: Record<string, unknown>) => Promise<Record<string, unknown>>
  requestSync: () => void
  reportResult: (result: {
    winnerId?: string
    draw?: boolean
    standings?: string[]
    scores?: Record<string, number>
    displayScore?: string
    metric?: string
    matchId?: string
  }) => Promise<Record<string, unknown>>
  onJoined: (callback: (data: Record<string, unknown>) => void) => () => void
  onPlayerJoined: (
    callback: (data: { player_id: string; player_ids: string[] }) => void,
  ) => () => void
  onPlayerLeft: (
    callback: (data: { player_id: string; player_ids: string[] }) => void,
  ) => () => void
  onAction: (callback: (data: UsionGameMessage) => void) => () => void
  onRealtime: (callback: (data: UsionGameMessage) => void) => () => void
  onSync: (
    callback: (data: {
      actions?: UsionGameMessage[]
      game_state?: Record<string, unknown>
    }) => void,
  ) => () => void
  onRoomAssigned: (callback: (data: { roomId: string }) => void) => () => void
  onConnectionState: (
    callback: (
      state: 'connected' | 'disconnected' | 'rejoining' | 'reconnected',
    ) => void,
  ) => () => void
}

type UsionSdk = {
  config: UsionConfig
  init: (options?: { timeout?: number }) => Promise<UsionConfig>
  user: {
    getId: () => string | null
    getName: () => string | null
    getAvatar: () => string | null
  }
  game: UsionGame
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
  return sdk().init({ timeout: 12_000 })
}

export function getUsionConfig() {
  return sdk().config
}

export function getUsionGame() {
  return sdk().game
}

export function getUsionCurrentUser() {
  const client = sdk()
  return {
    id: client.user.getId(),
    name: client.user.getName()?.trim() || 'Explorer',
    avatar: client.user.getAvatar(),
  }
}

export async function getUsionBestScore() {
  const record = await sdk().leaderboard.me()
  return record.score ?? 0
}

export async function syncUsionLeaderboard(
  score: number,
  correct: number,
  rounds: number,
) {
  const submission = await sdk().leaderboard.submit(score, {
    correct,
    rounds,
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

export async function reportUsionMatchResult({
  matchId,
  scores,
  standings,
}: {
  matchId: string
  scores: Record<string, number>
  standings: string[]
}) {
  const topScore = scores[standings[0]] ?? 0
  const tied =
    standings.length > 1 && (scores[standings[1]] ?? 0) === topScore
  return sdk().game.reportResult({
    winnerId: tied ? undefined : standings[0],
    draw: tied,
    standings,
    scores,
    displayScore: `${topScore.toLocaleString()} pts`,
    metric: 'points',
    matchId,
  })
}
