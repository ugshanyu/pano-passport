import { ArrowRight, Flag, Rotate3D, Search, Sparkles, Trophy } from 'lucide-react'
import { Brand } from '../components/Brand'
import { RoundSelector } from '../components/RoundSelector'
import { maxGameScore, roundPreviewUrl, type RoundCount } from '../lib/game'
import type { Round } from '../types'

type HomeScreenProps = {
  bestScore: number
  coverage: number
  previews: Round[]
  roundCount: RoundCount
  multiplayer?: {
    enabled: boolean
    isHost: boolean
    canStart: boolean
    connection: string
    presentCount: number
    expectedCount: number
    error: string | null
  }
  onRoundCount: (roundCount: RoundCount) => void
  onStart: () => void
}

export function HomeScreen({
  bestScore,
  coverage,
  previews,
  roundCount,
  multiplayer,
  onRoundCount,
  onStart,
}: HomeScreenProps) {
  const isGuest = Boolean(multiplayer?.enabled && !multiplayer.isHost)
  const startDisabled = Boolean(
    multiplayer?.enabled && (!multiplayer.canStart || isGuest),
  )
  const startLabel = isGuest
    ? 'Waiting for the host'
    : multiplayer?.enabled
      ? `Start ${roundCount}-round match`
      : 'Start exploring'

  return (
    <main className="home-screen">
      <nav className="home-nav" aria-label="Main navigation">
        <Brand />
        <div className="home-nav__aside">
          {bestScore > 0 && (
            <span className="best-score">
              <Trophy size={16} />
              Best {bestScore.toLocaleString()}
            </span>
          )}
          <a href="#how-it-works">How to play</a>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={15} />
            {multiplayer?.enabled
              ? 'Usion multiplayer room'
              : 'Real panoramas. One big world.'}
          </p>
          <h1>
            Spin the view.
            <br />
            <em>Guess the country.</em>
          </h1>
          <p className="hero-copy__intro">
            Explore real 360° scenes, follow the visual clues, and name the
            country. A perfect trip scores{' '}
            {maxGameScore(roundCount).toLocaleString()}.
          </p>
          <RoundSelector
            value={roundCount}
            disabled={isGuest}
            onChange={onRoundCount}
          />
          {multiplayer?.enabled && (
            <div className="multiplayer-status" aria-live="polite">
              <span className={`connection-dot connection-dot--${multiplayer.connection}`} />
              <strong>
                {multiplayer.presentCount} explorer
                {multiplayer.presentCount === 1 ? '' : 's'} connected
              </strong>
              {multiplayer.expectedCount > multiplayer.presentCount && (
                <small>Waiting for the rest of the room</small>
              )}
              {multiplayer.error && <small>{multiplayer.error}</small>}
            </div>
          )}
          <button
            className="primary-button hero-cta"
            type="button"
            disabled={startDisabled}
            onClick={onStart}
          >
            {startLabel}
            <ArrowRight size={20} />
          </button>
          <p className="hero-note">
            {multiplayer?.enabled
              ? 'The host chooses the trip · Everyone sees the same places'
              : `Free forever · No sign-up · ${coverage} verified open-license countries`}
          </p>
        </div>

        <div className="hero-postcards" aria-label="Open panorama previews">
          {previews.map((round, index) => (
            <figure
              className={`postcard postcard--${['left', 'center', 'right'][index]}`}
              key={round.id}
            >
              <img src={roundPreviewUrl(round)} alt="" />
              <figcaption>
                <Rotate3D size={14} />
                A real 360° place
              </figcaption>
            </figure>
          ))}
          <span className="hero-stamp" aria-hidden="true">
            SPIN
            <br />
            THE
            <br />
            PLANET
          </span>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <p className="eyebrow">How it works</p>
        <div className="how-grid">
          <article>
            <span>01</span>
            <h2>
              <Rotate3D size={21} /> Look around
            </h2>
            <p>Drag through a real 360° panorama and zoom in on useful details.</p>
          </article>
          <article>
            <span>02</span>
            <h2>
              <Search size={21} /> Read the clues
            </h2>
            <p>Architecture, landscape, signs, weather—every direction can help.</p>
          </article>
          <article>
            <span>03</span>
            <h2>
              <Flag size={21} /> Name the country
            </h2>
            <p>Choose from four countries. Correct earns 1,000; nearby misses earn partial points.</p>
          </article>
        </div>
      </section>

      <section className="open-data-note">
        <div>
          <p className="eyebrow">Open by design</p>
          <h2>Free means free—without a Maps bill.</h2>
        </div>
        <p>
          Every panorama links to its creator and reuse license. The catalog
          combines open Wikimedia photospheres with Mapillary street-level 360°
          imagery—without enabling a paid Google Maps API.
        </p>
      </section>

      <footer className="home-footer">
        <Brand compact />
        <p>
          Open 360° imagery from{' '}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
          {' and '}
          <a href="https://www.mapillary.com/" target="_blank" rel="noreferrer">
            Mapillary
          </a>
          {' · '}Viewers by{' '}
          <a href="https://pannellum.org/" target="_blank" rel="noreferrer">
            Pannellum
          </a>
          {' and '}
          <a
            href="https://mapillary.github.io/mapillary-js/"
            target="_blank"
            rel="noreferrer"
          >
            MapillaryJS
          </a>
          {' · '}Country coordinates by{' '}
          <a
            href="https://github.com/mledoze/countries"
            target="_blank"
            rel="noreferrer"
          >
            world-countries
          </a>
        </p>
      </footer>
    </main>
  )
}
