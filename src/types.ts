export type Round = {
  id: string
  city: string
  country: string
  countryCode: string
  landmark: string
  panoramaUrl: string
  imageWidth: number
  imageHeight: number
  photographer: string
  license: string
  licenseUrl: string
  sourceUrl: string
  initialYaw?: number
  initialPitch?: number
}

export type RoundResult = {
  round: Round
  guessedCountry: string
  guessedCountryCode: string
  correct: boolean
  points: number
}
