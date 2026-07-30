const BEST_SCORE_KEY = 'pano-passport-best-score'

export function storedBestScore() {
  try {
    const value = Number(window.localStorage.getItem(BEST_SCORE_KEY))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function saveBestScore(score: number) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score))
  } catch {
    // Usion still preserves the record if local storage is unavailable.
  }
}
