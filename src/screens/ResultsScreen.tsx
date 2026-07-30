import { Check, Copy, RotateCcw, Share2, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '../components/Brand'
import { Leaderboard } from '../components/Leaderboard'
import { MAX_GAME_SCORE, roundPreviewUrl } from '../lib/game'
import type { RoundResult } from '../types'

type ResultsScreenProps = {
  results: RoundResult[]
  bestScore: number
  isNewBest: boolean
  embedded: boolean
  onBestScore: (score: number) => void
  onPlayAgain: () => void
  onHome: () => void
}

function resultMessage(score: number) {
  if (score === MAX_GAME_SCORE) return ['Perfect passport!', 'Five countries. Five correct answers.']
  if (score >= 4000) return ['World class!', 'You read these places like a local.']
  if (score >= 2500) return ['Globe-trotter!', 'Your country radar is warming up.']
  return ['Adventure started!', 'Spin the planet and take another trip.']
}

export function ResultsScreen({
  results,
  bestScore,
  isNewBest,
  embedded,
  onBestScore,
  onPlayAgain,
  onHome,
}: ResultsScreenProps) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'
  const total = results.reduce((sum, result) => sum + result.points, 0)
  const correctCount = results.filter(({ correct }) => correct).length
  const [title, subtitle] = resultMessage(total)

  const share = async () => {
    const text = `I identified ${correctCount}/5 countries in PanoPassport’s 360° challenge 🌍`
    if (canShare) {
      await navigator.share({ title: 'PanoPassport', text, url: window.location.origin })
      return
    }
    await navigator.clipboard.writeText(`${text} ${window.location.origin}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="results-screen">
      <header className="results-nav">
        {embedded ? (
          <Brand />
        ) : (
          <button type="button" className="brand-button" onClick={onHome}>
            <Brand />
          </button>
        )}
        <span>Trip complete</span>
      </header>

      <section className="results-hero">
        <div className="score-orbit" aria-label={`${correctCount} correct out of 5`}>
          <Trophy size={28} />
          <strong>{correctCount}/5</strong>
          <span>{total.toLocaleString()} points</span>
        </div>
        {isNewBest && <p className="new-best">New personal best</p>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="results-actions">
          <button className="primary-button" type="button" onClick={onPlayAgain}>
            <RotateCcw size={18} />
            Play again
          </button>
          <button className="secondary-button" type="button" onClick={share}>
            {copied ? <Check size={18} /> : canShare ? <Share2 size={18} /> : <Copy size={18} />}
            {copied ? 'Copied' : 'Share score'}
          </button>
        </div>
        <p className="best-line">Your best: {bestScore.toLocaleString()} points</p>
      </section>

      <section className="round-recap" aria-label="Round results">
        {results.map((result, index) => (
          <article className="recap-card" key={result.round.id}>
            <div className="recap-card__image">
              <img src={roundPreviewUrl(result.round)} alt="" />
              <span>{index + 1}</span>
            </div>
            <div className="recap-card__body">
              <p>{result.round.country}</p>
              <h2>{result.round.landmark}</h2>
              <span>
                {result.correct ? 'Correct' : `Your guess: ${result.guessedCountry}`}
              </span>
            </div>
            <strong className={result.correct ? 'recap-correct' : 'recap-wrong'}>
              {result.correct ? <Check size={17} /> : <X size={17} />}
              {result.points.toLocaleString()}
            </strong>
          </article>
        ))}
      </section>

      {embedded && (
        <Leaderboard
          score={total}
          correct={correctCount}
          onBestScore={onBestScore}
        />
      )}

      {!embedded && (
        <button type="button" className="text-button results-home" onClick={onHome}>
          Back to home
        </button>
      )}
    </main>
  )
}
