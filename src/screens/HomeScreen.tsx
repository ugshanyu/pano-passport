import { ArrowRight, Flag, Rotate3D, Search, Sparkles, Trophy } from 'lucide-react'
import { Brand } from '../components/Brand'
import { MAX_GAME_SCORE, roundPreviewUrl } from '../lib/game'
import type { Round } from '../types'

type HomeScreenProps = {
  bestScore: number
  coverage: number
  previews: Round[]
  onStart: () => void
}

export function HomeScreen({
  bestScore,
  coverage,
  previews,
  onStart,
}: HomeScreenProps) {
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
            Five panoramas. One big world.
          </p>
          <h1>
            Spin the view.
            <br />
            <em>Guess the country.</em>
          </h1>
          <p className="hero-copy__intro">
            Explore real 360° scenes, follow the visual clues, and name the
            country. A perfect trip scores {MAX_GAME_SCORE.toLocaleString()}.
          </p>
          <button className="primary-button hero-cta" type="button" onClick={onStart}>
            Start exploring
            <ArrowRight size={20} />
          </button>
          <p className="hero-note">
            Free forever · No sign-up · {coverage} verified open-license countries
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
            <p>Choose from the full country list and earn 1,000 points if correct.</p>
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
        </p>
      </footer>
    </main>
  )
}
