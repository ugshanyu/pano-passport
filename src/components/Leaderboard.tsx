import { Globe2, RefreshCw, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  syncUsionLeaderboard,
  type LeaderboardEntry,
} from '../lib/usion'

type LeaderboardProps = {
  score: number
  correct: number
  rounds: number
  onBestScore: (score: number) => void
}

type Board = 'friends' | 'worldwide'
type Records = Record<Board, LeaderboardEntry[]>

const emptyRecords: Records = { friends: [], worldwide: [] }

function playerName(entry: LeaderboardEntry) {
  return entry.name?.trim() || 'Explorer'
}

function initials(entry: LeaderboardEntry) {
  return playerName(entry).slice(0, 2).toUpperCase()
}

export function Leaderboard({
  score,
  correct,
  rounds,
  onBestScore,
}: LeaderboardProps) {
  const [board, setBoard] = useState<Board>('friends')
  const [records, setRecords] = useState<Records>(emptyRecords)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const runSynced = useRef(false)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const result = await syncUsionLeaderboard(score, correct, rounds)
      setRecords({ friends: result.friends, worldwide: result.worldwide })
      onBestScore(result.best)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [correct, onBestScore, rounds, score])

  useEffect(() => {
    if (runSynced.current) return
    runSynced.current = true
    void load()
  }, [load])

  const entries = records[board]

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title">
      <div className="leaderboard__heading">
        <div>
          <p>Usion records</p>
          <h2 id="leaderboard-title">Passport leaderboard</h2>
        </div>
        <div className="leaderboard__tabs" aria-label="Leaderboard view">
          <button
            type="button"
            className={board === 'friends' ? 'is-active' : ''}
            onClick={() => setBoard('friends')}
          >
            <Users size={15} />
            Friends
          </button>
          <button
            type="button"
            className={board === 'worldwide' ? 'is-active' : ''}
            onClick={() => setBoard('worldwide')}
          >
            <Globe2 size={15} />
            Global
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <p className="leaderboard__state" aria-live="polite">
          Updating records…
        </p>
      )}

      {status === 'error' && (
        <div className="leaderboard__state">
          <p>Records are unavailable right now.</p>
          <button type="button" onClick={() => void load()}>
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && entries.length === 0 && (
        <p className="leaderboard__state">
          {board === 'friends'
            ? 'Your friends have not stamped a passport yet.'
            : 'Be the first explorer on the board.'}
        </p>
      )}

      {status === 'ready' && entries.length > 0 && (
        <ol className="leaderboard__list">
          {entries.map((entry) => (
            <li className={entry.is_me ? 'is-me' : ''} key={entry.user_id}>
              <span className="leaderboard__rank">#{entry.rank}</span>
              <span className="leaderboard__avatar" aria-hidden="true">
                {entry.avatar ? <img src={entry.avatar} alt="" /> : initials(entry)}
              </span>
              <span className="leaderboard__player">
                <strong>{playerName(entry)}</strong>
                {entry.is_me && <small>You</small>}
              </span>
              <strong className="leaderboard__score">
                {entry.score.toLocaleString()}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
