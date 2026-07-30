import { useEffect, useMemo, useState } from 'react'
import './App.css'
import roundsData from './data/rounds.json'
import { selectRounds } from './lib/game'
import { createCountryOptions, scoreGuess } from './lib/geography'
import { getUsionBestScore } from './lib/usion'
import { GameScreen } from './screens/GameScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import type { Round, RoundResult } from './types'

type Screen = 'home' | 'game' | 'results'
const BEST_SCORE_KEY = 'pano-passport-best-score'
const rounds = roundsData as Round[]

function storedBestScore() {
  try {
    const value = Number(window.localStorage.getItem(BEST_SCORE_KEY))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function saveBestScore(score: number) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score))
  } catch {
    // Usion still preserves the record if local storage is unavailable.
  }
}

function App({ embedded = false }: { embedded?: boolean }) {
  const [screen, setScreen] = useState<Screen>(embedded ? 'game' : 'home')
  const [gameRounds, setGameRounds] = useState<Round[]>(
    embedded ? () => selectRounds(rounds) : [],
  )
  const [roundIndex, setRoundIndex] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null)
  const [bestScore, setBestScore] = useState(storedBestScore)
  const [isNewBest, setIsNewBest] = useState(false)

  const score = useMemo(
    () => results.reduce((sum, result) => sum + result.points, 0),
    [results],
  )

  useEffect(() => {
    if (!embedded) return
    void getUsionBestScore()
      .then((usionBest) => {
        setBestScore((current) => {
          const next = Math.max(current, usionBest)
          if (next > current) saveBestScore(next)
          return next
        })
      })
      .catch(() => {
        // Record loading must never delay play.
      })
  }, [embedded])

  const updateBestScore = (newScore: number) => {
    setBestScore((current) => {
      const next = Math.max(current, newScore)
      if (next > current) saveBestScore(next)
      return next
    })
  }

  const startGame = () => {
    setGameRounds(selectRounds(rounds))
    setRoundIndex(0)
    setResults([])
    setCurrentResult(null)
    setIsNewBest(false)
    setScreen('game')
    window.scrollTo(0, 0)
  }

  const submitGuess = (countryCode: string, countryName: string) => {
    const round = gameRounds[roundIndex]
    const { distanceKm, points } = scoreGuess(countryCode, round)
    const correct = countryCode.toUpperCase() === round.countryCode.toUpperCase()
    const result = {
      round,
      guessedCountry: countryName,
      guessedCountryCode: countryCode,
      correct,
      distanceKm,
      points,
    }
    setResults((current) => [...current, result])
    setCurrentResult(result)
  }

  const continueGame = () => {
    if (roundIndex < gameRounds.length - 1) {
      setRoundIndex((index) => index + 1)
      setCurrentResult(null)
      return
    }

    const finalScore = score
    const newBest = finalScore > bestScore
    if (newBest) {
      setBestScore(finalScore)
      saveBestScore(finalScore)
    }
    setIsNewBest(newBest)
    setScreen('results')
    window.scrollTo(0, 0)
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        bestScore={bestScore}
        coverage={new Set(rounds.map(({ countryCode }) => countryCode)).size}
        previews={rounds.slice(0, 3)}
        onStart={startGame}
      />
    )
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        results={results}
        bestScore={bestScore}
        isNewBest={isNewBest}
        embedded={embedded}
        onBestScore={updateBestScore}
        onPlayAgain={startGame}
        onHome={() => setScreen('home')}
      />
    )
  }

  const round = gameRounds[roundIndex]
  return (
    <GameScreen
      key={round.id}
      round={round}
      options={createCountryOptions(round, rounds)}
      nextRound={gameRounds[roundIndex + 1]}
      roundIndex={roundIndex}
      score={score}
      result={currentResult}
      onGuess={submitGuess}
      onContinue={continueGame}
    />
  )
}

export default App
