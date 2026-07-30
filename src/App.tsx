import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import roundsData from './data/rounds.json'
import { useUsionMultiplayer } from './hooks/useUsionMultiplayer'
import { saveBestScore, storedBestScore } from './lib/best-score'
import {
  DEFAULT_ROUND_COUNT,
  selectRounds,
  type RoundCount,
} from './lib/game'
import { createCountryOptions, scoreGuess } from './lib/geography'
import { buildMultiplayerResults, outcomeToRoundResult } from './lib/results'
import { getUsionBestScore } from './lib/usion'
import { GameScreen } from './screens/GameScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import type { Round, RoundResult } from './types'

type Screen = 'home' | 'game' | 'results'
const rounds = roundsData as Round[]

function App({ embedded = false }: { embedded?: boolean }) {
  const [screen, setScreen] = useState<Screen>('home')
  const [roundCount, setRoundCount] =
    useState<RoundCount>(DEFAULT_ROUND_COUNT)
  const [gameRounds, setGameRounds] = useState<Round[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null)
  const [bestScore, setBestScore] = useState(storedBestScore)
  const [isNewBest, setIsNewBest] = useState(false)
  const processedMatchRef = useRef<string | null>(null)
  const multiplayer = useUsionMultiplayer({ embedded, catalog: rounds })

  const soloScore = useMemo(
    () => results.reduce((sum, result) => sum + result.points, 0),
    [results],
  )
  const multiplayerScore =
    (multiplayer.state.myId &&
      multiplayer.state.scores[multiplayer.state.myId]) ||
    0
  const score = multiplayer.state.enabled ? multiplayerScore : soloScore

  const multiplayerRounds = useMemo(
    () =>
      multiplayer.state.roundIds
        .map((id) => rounds.find((round) => round.id === id))
        .filter((round): round is Round => Boolean(round)),
    [multiplayer.state.roundIds],
  )

  const multiplayerResults = useMemo(() => {
    return buildMultiplayerResults(
      multiplayerRounds,
      multiplayer.state.history,
      multiplayer.state.myId,
    )
  }, [multiplayer.state.history, multiplayer.state.myId, multiplayerRounds])

  useEffect(() => {
    if (!multiplayer.state.enabled) return
    if (
      multiplayer.state.phase === 'connecting' ||
      multiplayer.state.phase === 'waiting' ||
      multiplayer.state.phase === 'error'
    ) {
      setScreen('home')
      return
    }
    if (
      multiplayer.state.phase === 'playing' ||
      multiplayer.state.phase === 'revealed'
    ) {
      setRoundCount(multiplayer.state.roundCount)
      setGameRounds(multiplayerRounds)
      setScreen('game')
      window.scrollTo(0, 0)
      return
    }
    if (multiplayer.state.phase === 'finished') {
      setResults(multiplayerResults)
      setScreen('results')
      window.scrollTo(0, 0)
      if (
        multiplayer.state.matchId &&
        processedMatchRef.current !== multiplayer.state.matchId
      ) {
        processedMatchRef.current = multiplayer.state.matchId
        const newBest = multiplayerScore > bestScore
        setIsNewBest(newBest)
        if (newBest) updateBestScore(multiplayerScore)
      }
    }
  }, [
    bestScore,
    multiplayer.state.enabled,
    multiplayer.state.matchId,
    multiplayer.state.phase,
    multiplayer.state.roundCount,
    multiplayerResults,
    multiplayerRounds,
    multiplayerScore,
  ])

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
    if (multiplayer.state.enabled) {
      void multiplayer.startMatch(roundCount)
      return
    }
    setGameRounds(selectRounds(rounds, roundCount))
    setRoundIndex(0)
    setResults([])
    setCurrentResult(null)
    setIsNewBest(false)
    setScreen('game')
    window.scrollTo(0, 0)
  }

  const submitGuess = (countryCode: string, countryName: string) => {
    if (multiplayer.state.enabled) {
      void multiplayer.submitGuess(countryCode, countryName)
      return
    }
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
    if (multiplayer.state.enabled) {
      void multiplayer.continueMatch()
      return
    }
    if (roundIndex < gameRounds.length - 1) {
      setRoundIndex((index) => index + 1)
      setCurrentResult(null)
      return
    }

    const finalScore = soloScore
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
        roundCount={roundCount}
        multiplayer={
          embedded
            ? {
                enabled: multiplayer.state.enabled,
                isHost: multiplayer.isHost,
                canStart: multiplayer.canStart,
                connection: multiplayer.state.connection,
                presentCount: multiplayer.state.presentIds.length,
                expectedCount: multiplayer.state.expectedPlayerIds.length,
                error: multiplayer.state.error,
              }
            : undefined
        }
        onRoundCount={setRoundCount}
        onStart={startGame}
      />
    )
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        results={multiplayer.state.enabled ? multiplayerResults : results}
        bestScore={bestScore}
        isNewBest={isNewBest}
        embedded={embedded}
        multiplayer={
          multiplayer.state.enabled
            ? {
                myId: multiplayer.state.myId,
                standings: multiplayer.standings,
                isHost: multiplayer.isHost,
              }
            : undefined
        }
        canPlayAgain={!multiplayer.state.enabled || multiplayer.isHost}
        playAgainLabel={
          multiplayer.state.enabled && !multiplayer.isHost
            ? 'Waiting for host'
            : 'Play again'
        }
        canChangeRounds={!embedded || (multiplayer.state.enabled && multiplayer.isHost)}
        onBestScore={updateBestScore}
        onPlayAgain={startGame}
        onHome={() => {
          if (multiplayer.state.enabled) {
            void multiplayer.resetMatch()
            return
          }
          setScreen('home')
        }}
      />
    )
  }

  const activeRoundIndex = multiplayer.state.enabled
    ? multiplayer.state.roundIndex
    : roundIndex
  const round = gameRounds[activeRoundIndex]
  if (!round) {
    return (
      <main className="boot-state">
        <h1>Preparing the next panorama…</h1>
      </main>
    )
  }
  const multiplayerResult =
    multiplayer.state.myId &&
    multiplayer.state.history[activeRoundIndex]?.[multiplayer.state.myId]
  const revealedResult = multiplayer.state.enabled
    ? multiplayerResult
      ? outcomeToRoundResult(round, multiplayerResult)
      : null
    : currentResult

  return (
    <GameScreen
      key={round.id}
      round={round}
      options={createCountryOptions(round, rounds)}
      nextRound={gameRounds[activeRoundIndex + 1]}
      roundIndex={activeRoundIndex}
      totalRounds={gameRounds.length}
      score={score}
      result={revealedResult}
      waitingForReveal={
        multiplayer.state.enabled &&
        (multiplayer.hasGuessed || multiplayer.isSubmitting) &&
        multiplayer.state.phase === 'playing'
      }
      answeredPlayers={Object.keys(multiplayer.state.guesses).length}
      totalPlayers={multiplayer.state.activePlayerIds.length}
      canContinue={!multiplayer.state.enabled || multiplayer.isHost}
      continueLabel={
        multiplayer.state.enabled && !multiplayer.isHost
          ? 'Waiting for host'
          : undefined
      }
      onGuess={submitGuess}
      onContinue={continueGame}
    />
  )
}

export default App
