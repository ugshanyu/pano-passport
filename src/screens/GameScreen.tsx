import { ArrowRight, CheckCircle2, Flag, Rotate3D, Trophy, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Brand } from '../components/Brand'
import { CountryPicker } from '../components/CountryPicker'
import { PanoramaViewer } from '../components/PanoramaViewer'
import { MAX_ROUND_SCORE, roundPreviewUrl, ROUND_COUNT } from '../lib/game'
import type { Round, RoundResult } from '../types'

type GameScreenProps = {
  round: Round
  nextRound?: Round
  roundIndex: number
  score: number
  result: RoundResult | null
  onGuess: (countryCode: string, countryName: string) => void
  onContinue: () => void
}

export function GameScreen({
  round,
  nextRound,
  roundIndex,
  score,
  result,
  onGuess,
  onContinue,
}: GameScreenProps) {
  const [selection, setSelection] = useState({ code: '', name: '' })

  useEffect(() => {
    if (!nextRound) return
    const image = new Image()
    image.src = roundPreviewUrl(nextRound)
  }, [nextRound])

  const isLastRound = roundIndex === ROUND_COUNT - 1

  return (
    <main className={`game-screen ${result ? 'game-screen--revealed' : ''}`}>
      <PanoramaViewer round={round} />
      <div className="scene-shade" aria-hidden="true" />

      <header className="game-nav">
        <Brand compact inverted />
        <div
          className="round-progress"
          aria-label={`Round ${roundIndex + 1} of ${ROUND_COUNT}`}
        >
          {Array.from({ length: ROUND_COUNT }, (_, index) => (
            <span
              className={index <= roundIndex ? 'round-progress__dot--active' : ''}
              key={index}
            />
          ))}
        </div>
        <div className="score-pill">
          <Trophy size={15} />
          <span>{score.toLocaleString()}</span>
        </div>
      </header>

      {!result && (
        <div className="round-prompt">
          <span>Round {roundIndex + 1}</span>
          <strong>Which country is this?</strong>
          <small>
            <Rotate3D size={13} /> Explore the full 360° view
          </small>
        </div>
      )}

      <div className="photo-credit">
        Panorama by{' '}
        <a href={round.sourceUrl} target="_blank" rel="noreferrer">
          {round.photographer}
        </a>
        {' · '}
        <a href={round.licenseUrl} target="_blank" rel="noreferrer">
          {round.license}
        </a>
      </div>

      {!result ? (
        <section className="guess-dock" aria-label="Submit your country guess">
          <CountryPicker
            value={selection.code}
            onChange={(code, name) => setSelection({ code, name })}
          />
          <button
            className="guess-button"
            type="button"
            disabled={!selection.code}
            onClick={() => onGuess(selection.code, selection.name)}
          >
            Lock in guess
            <Flag size={17} />
          </button>
        </section>
      ) : (
        <section className="reveal-card" aria-live="polite">
          <div className={`answer-mark ${result.correct ? 'answer-mark--correct' : ''}`}>
            {result.correct ? <CheckCircle2 /> : <XCircle />}
          </div>
          <div className="reveal-card__location">
            <p>{result.correct ? 'Correct country!' : `You chose ${result.guessedCountry}`}</p>
            <h1>{round.landmark}</h1>
            <span>
              {round.city}, {round.country}
            </span>
          </div>
          <div className="reveal-card__score">
            <span>Round score</span>
            <strong>+{result.points.toLocaleString()}</strong>
            <small>of {MAX_ROUND_SCORE.toLocaleString()}</small>
          </div>
          <button className="primary-button" type="button" onClick={onContinue}>
            {isLastRound ? 'See final score' : 'Next panorama'}
            <ArrowRight size={19} />
          </button>
        </section>
      )}
    </main>
  )
}
