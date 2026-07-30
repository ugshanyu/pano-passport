type RoundBase = {
  id: string
  city: string
  country: string
  countryCode: string
  landmark: string
  photographer: string
  license: string
  licenseUrl: string
  sourceUrl: string
  initialYaw?: number
  initialPitch?: number
}

export type WikimediaRound = RoundBase & {
  provider: 'wikimedia'
  panoramaUrl: string
  imageWidth: number
  imageHeight: number
}

export type MapillaryRound = RoundBase & {
  provider: 'mapillary'
  mapillaryImageId: string
  previewUrl: string
}

export type Round = WikimediaRound | MapillaryRound

export type RoundResult = {
  round: Round
  guessedCountry: string
  guessedCountryCode: string
  correct: boolean
  points: number
}
