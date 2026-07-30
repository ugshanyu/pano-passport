import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const MAPILLARY_API = 'https://graph.mapillary.com/images'
const WIKIDATA_API = 'https://query.wikidata.org/sparql'
const DEFAULT_OUTPUT = '/tmp/pano-passport-mapillary-candidates.json'
const RADII_METERS = [250, 500, 1_000, 1_500]
const WORKERS = 8

const token = process.env.MAPILLARY_ACCESS_TOKEN
if (!token) {
  throw new Error('Set MAPILLARY_ACCESS_TOKEN before running catalog:discover.')
}

const outputPath = resolve(
  process.argv.find((value) => value.startsWith('--output='))?.split('=')[1] ??
    DEFAULT_OUTPUT,
)
const requestedLimit = Number(
  process.argv.find((value) => value.startsWith('--limit='))?.split('=')[1] ??
    1_200,
)
const requestedOffset = Number(
  process.argv.find((value) => value.startsWith('--offset='))?.split('=')[1] ??
    0,
)

const query = `
SELECT ?item ?itemLabel ?coord ?countryLabel ?countryCode ?adminLabel ?sitelinks WHERE {
  ?item wdt:P1435 wd:Q9259;
        wdt:P625 ?coord;
        wikibase:sitelinks ?sitelinks.
  OPTIONAL {
    ?item wdt:P17 ?country.
    ?country wdt:P297 ?countryCode.
  }
  OPTIONAL { ?item wdt:P131 ?admin. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 4000
`

async function requestJson(url, options = {}, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, options)
    if (response.ok) return response.json()
    if (attempt === attempts - 1) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`)
    }
    await new Promise((resolveDelay) =>
      setTimeout(resolveDelay, 750 * (attempt + 1)),
    )
  }
  throw new Error(`Unable to request ${url}`)
}

function parsePoint(value) {
  const match = /^Point\(([-\d.]+) ([-\d.]+)\)$/.exec(value)
  return match ? { longitude: Number(match[1]), latitude: Number(match[2]) } : null
}

function wikidataPlaces(bindings) {
  const seen = new Set()
  const places = []

  for (const binding of bindings) {
    const qid = binding.item.value.split('/').pop()
    const coordinates = parsePoint(binding.coord.value)
    const countryCode = binding.countryCode?.value?.toUpperCase()
    if (
      seen.has(qid) ||
      !coordinates ||
      !countryCode ||
      countryCode.length !== 2 ||
      binding.itemLabel.value.startsWith('Q')
    ) {
      continue
    }

    seen.add(qid)
    places.push({
      qid,
      landmark: binding.itemLabel.value,
      city: binding.adminLabel?.value ?? binding.countryLabel?.value ?? 'Unknown',
      country: binding.countryLabel?.value ?? 'Unknown',
      countryCode,
      ...coordinates,
      sitelinks: Number(binding.sitelinks.value),
    })
    if (places.length >= requestedLimit + requestedOffset) break
  }

  return places.slice(requestedOffset)
}

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

async function findPanorama(place) {
  for (const radius of RADII_METERS) {
    const url = new URL(MAPILLARY_API)
    url.searchParams.set('bbox', boundingBox(place, radius))
    url.searchParams.set('limit', '100')
    url.searchParams.set('is_pano', 'true')
    url.searchParams.set(
      'fields',
      [
        'id',
        'is_pano',
        'camera_type',
        'computed_geometry',
        'captured_at',
        'thumb_1024_url',
        'creator',
      ].join(','),
    )

    let payload
    try {
      payload = await requestJson(url, {
        headers: { Authorization: `OAuth ${token}` },
      })
    } catch {
      continue
    }

    const panoramas = (payload.data ?? [])
      .filter(
        (image) =>
          image.is_pano &&
          image.computed_geometry?.type === 'Point' &&
          image.computed_geometry.coordinates?.length === 2 &&
          image.thumb_1024_url,
      )
      .map((image) => {
        const [longitude, latitude] = image.computed_geometry.coordinates
        return {
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
        }
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)

    if (panoramas.length > 0) return { ...place, panorama: panoramas[0] }
  }

  return null
}

const wikidataUrl = new URL(WIKIDATA_API)
wikidataUrl.searchParams.set('query', query)
wikidataUrl.searchParams.set('format', 'json')
const wikidata = await requestJson(wikidataUrl, {
  headers: {
    'User-Agent': 'PanoPassport/1.0 (https://pano-passport.vercel.app)',
  },
})
const places = wikidataPlaces(wikidata.results.bindings)
const candidates = []
let nextIndex = 0

await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    while (nextIndex < places.length) {
      const index = nextIndex
      nextIndex += 1
      const candidate = await findPanorama(places[index])
      if (candidate) candidates.push(candidate)
      if ((index + 1) % 50 === 0) {
        console.log(`Checked ${index + 1}/${places.length}; found ${candidates.length}`)
      }
    }
  }),
)

const uniqueImages = new Map()
for (const candidate of candidates.sort((a, b) => b.sitelinks - a.sitelinks)) {
  if (!uniqueImages.has(candidate.panorama.id)) {
    uniqueImages.set(candidate.panorama.id, candidate)
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  source: 'Wikidata UNESCO World Heritage sites + Mapillary panoramic imagery',
  checked: places.length,
  candidates: [...uniqueImages.values()],
}
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)

const countries = new Set(result.candidates.map(({ countryCode }) => countryCode))
console.log(
  `Saved ${result.candidates.length} unique panoramas across ${countries.size} countries to ${outputPath}`,
)
