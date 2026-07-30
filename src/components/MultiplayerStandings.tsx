import { Crown, UserRound } from 'lucide-react'
import type { MultiplayerStanding } from '../types'

export function MultiplayerStandings({
  standings,
  myId,
}: {
  standings: MultiplayerStanding[]
  myId: string | null
}) {
  if (standings.length < 2) return null

  return (
    <section className="match-standings" aria-labelledby="match-standings-title">
      <p>Usion multiplayer</p>
      <h2 id="match-standings-title">Match standings</h2>
      <ol>
        {standings.map((player, index) => (
          <li className={player.id === myId ? 'is-me' : ''} key={player.id}>
            <span className="match-standings__rank">
              {index === 0 ? <Crown size={17} /> : `#${index + 1}`}
            </span>
            <span className="match-standings__avatar">
              {player.avatar ? (
                <img src={player.avatar} alt="" />
              ) : (
                <UserRound size={18} />
              )}
            </span>
            <span>
              <strong>{player.id === myId ? 'You' : player.name}</strong>
              {index === 0 && <small>Winner</small>}
            </span>
            <strong>{player.score.toLocaleString()}</strong>
          </li>
        ))}
      </ol>
    </section>
  )
}
