import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const API = 'https://graph.mapillary.com/images'
const RADII_METERS = [250, 500, 1_000, 1_500]
const token = process.env.MAPILLARY_ACCESS_TOKEN

if (!token) {
  throw new Error('Set MAPILLARY_ACCESS_TOKEN before finding alternatives.')
}

function argument(name, fallback) {
  return (
    process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1] ??
    fallback
  )
}

const inputPath = resolve(
  argument('input', '/tmp/pano-passport-mapillary-candidates.json'),
)
const outputPath = resolve(
  argument('output', '/tmp/pano-passport-mapillary-alternatives.json'),
)
const indexes = new Set(
  argument('indexes', '')
    .split(',')
    .map(Number)
    .filter(Number.isFinite),
)
const limit = Number(argument('limit', '12'))

function boundingBox({ longitude, latitude }, meters) {
  const latitudeOffset = meters / 111_320
  const longitudeOffset =
    meters /
    (111_320 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)))
  return [
    longitude - longitudeOffset,
    latitude - latitudeOffset,
    longitude + longitudeOffset,
    latitude + latitudeOffset,
  ].join(',')
}

function distanceMeters(a, b) {
  const radius = 6_371_000
  const latitudeA = (a.latitude * Math.PI) / 180
  const latitudeB = (b.latitude * Math.PI) / 180
  const latitudeDelta = ((b.latitude - a.latitude) * Math.PI) / 180
  const longitudeDelta = ((b.longitude - a.longitude) * Math.PI) / 180
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(haversine))
}

async function request(place) {
  const images = new Map()

  for (const radius of RADII_METERS) {
    const url = new URL(API)
    url.searchParams.set('bbox', boundingBox(place, radius))
    url.searchParams.set('limit', '100')
    url.searchParams.set('is_pano', 'true')
    url.searchParams.set(
      'fields',
      'id,is_pano,camera_type,computed_geometry,captured_at,thumb_1024_url,creator',
    )

    const response = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
    })
    if (!response.ok) continue

    const payload = await response.json()
    for (const image of payload.data ?? []) {
      const coordinates = image.computed_geometry?.coordinates
      if (!image.is_pano || coordinates?.length !== 2 || !image.thumb_1024_url) {
        continue
      }
      const [longitude, latitude] = coordinates
      images.set(image.id, {
        id: image.id,
        creator: image.creator?.username ?? 'Mapillary contributor',
        capturedAt: image.captured_at ?? null,
        cameraType: image.camera_type ?? 'spherical',
        longitude,
        latitude,
        distanceMeters: Math.round(
          distanceMeters(place, { longitude, latitude }),
        ),
        previewUrl: image.thumb_1024_url,
        sourceUrl: `https://www.mapillary.com/app/?pKey=${image.id}`,
      })
    }

    if (images.size >= limit) break
  }

  return [...images.values()]
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit)
}

const catalog = JSON.parse(await readFile(inputPath, 'utf8'))
const selected = catalog.candidates.filter((_, index) => indexes.has(index + 1))
const results = []

for (const place of selected) {
  const alternatives = await request(place)
  results.push({
    landmark: place.landmark,
    city: place.city,
    country: place.country,
    countryCode: place.countryCode,
    longitude: place.longitude,
    latitude: place.latitude,
    alternatives,
  })
  console.log(`${place.landmark}: ${alternatives.length} panoramas`)
}

await writeFile(outputPath, `${JSON.stringify({ results }, null, 2)}\n`)
console.log(`Saved alternatives to ${outputPath}`)
