import { useMemo, useState } from 'react'
import './App.css'
import roundsData from './data/rounds.json'
import { scoreForCountry, selectRounds } from './lib/game'
import { GameScreen } from './screens/GameScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import type { Round, RoundResult } from './types'

type Screen = 'home' | 'game' | 'results'
const BEST_SCORE_KEY = 'worldguessr-best-score'
const rounds = roundsData as Round[]

function storedBestScore() {
  const value = Number(window.localStorage.getItem(BEST_SCORE_KEY))
  return Number.isFinite(value) ? value : 0
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [gameRounds, setGameRounds] = useState<Round[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null)
  const [bestScore, setBestScore] = useState(storedBestScore)
  const [isNewBest, setIsNewBest] = useState(false)

  const score = useMemo(
    () => results.reduce((sum, result) => sum + result.points, 0),
    [results],
  )

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
    const points = scoreForCountry(countryCode, round.countryCode)
    const result = {
      round,
      guessedCountry: countryName,
      guessedCountryCode: countryCode,
      correct: points > 0,
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
      window.localStorage.setItem(BEST_SCORE_KEY, String(finalScore))
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
