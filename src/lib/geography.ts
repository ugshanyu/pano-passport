import countryCentersData from '../data/country-centers.json'
import type { CountryOption, Round } from '../types'
import { MAX_ROUND_SCORE } from './game'

const MAX_WRONG_SCORE = 750
const DISTANCE_DECAY_KM = 2_500
const countryNameOverrides: Record<string, string> = {
  BO: 'Bolivia',
  CN: 'China',
  CZ: 'Czechia',
  GB: 'United Kingdom',
  IR: 'Iran',
  KR: 'South Korea',
  LA: 'Laos',
  PS: 'Palestine',
  RU: 'Russia',
  TZ: 'Tanzania',
  US: 'United States',
  VN: 'Vietnam',
}

type Coordinate = {
  latitude: number
  longitude: number
}

const countryCenters = new Map(
  Object.entries(countryCentersData).map(([code, latlng]) => [
    code,
    {
      latitude: latlng[0],
      longitude: latlng[1],
    },
  ]),
)

export function distanceKm(from: Coordinate, to: Coordinate) {
  const radiusKm = 6_371
  const latitudeA = (from.latitude * Math.PI) / 180
  const latitudeB = (to.latitude * Math.PI) / 180
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * radiusKm * Math.asin(Math.sqrt(haversine))
}

function seededRandom(seed: string) {
  let value = 2_166_136_261
  for (const character of seed) {
    value ^= character.charCodeAt(0)
    value = Math.imul(value, 16_777_619)
  }

  return () => {
    value += 0x6d2b79f5
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

function shuffled<T>(values: T[], random: () => number) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function createCountryOptions(round: Round, rounds: Round[]) {
  const names = new Map<string, string>()
  for (const candidate of rounds) {
    names.set(
      candidate.countryCode,
      countryNameOverrides[candidate.countryCode] ?? candidate.country,
    )
  }

  const nearby = [...names]
    .filter(([code]) => code !== round.countryCode && countryCenters.has(code))
    .map(([code, name]) => ({
      code,
      name,
      distance: distanceKm(round, countryCenters.get(code)!),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 12)

  const random = seededRandom(round.id)
  const distractors = shuffled(nearby, random)
    .slice(0, 3)
    .map(({ code, name }) => ({ code, name }))
  const answer: CountryOption = {
    code: round.countryCode,
    name:
      countryNameOverrides[round.countryCode] ??
      round.country,
  }

  return shuffled([answer, ...distractors], random)
}

export function scoreGuess(guessCode: string, round: Round) {
  if (guessCode.toUpperCase() === round.countryCode.toUpperCase()) {
    return { distanceKm: 0, points: MAX_ROUND_SCORE }
  }

  const countryCenter = countryCenters.get(guessCode.toUpperCase())
  if (!countryCenter) return { distanceKm: 20_000, points: 0 }

  const measuredDistance = distanceKm(round, countryCenter)
  const points = Math.round(
    MAX_WRONG_SCORE * Math.exp(-measuredDistance / DISTANCE_DECAY_KM),
  )
  return { distanceKm: Math.round(measuredDistance), points }
}

export function formatDistance(distance: number) {
  if (distance === 0) return 'Exact country'
  const rounded = distance < 100 ? Math.round(distance) : Math.round(distance / 10) * 10
  return `~${rounded.toLocaleString()} km away`
}
