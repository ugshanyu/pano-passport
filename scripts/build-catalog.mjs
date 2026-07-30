import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DEFAULT_MAIN = '/tmp/pano-passport-mapillary-candidates.json'
const DEFAULT_MORE = '/tmp/pano-passport-mapillary-more.json'
const DEFAULT_ALTERNATIVES = '/tmp/pano-passport-mapillary-alternatives.json'

function argument(name, fallback) {
  return resolve(
    process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1] ??
      fallback,
  )
}

const paths = {
  main: argument('main', DEFAULT_MAIN),
  more: argument('more', DEFAULT_MORE),
  alternatives: argument('alternatives', DEFAULT_ALTERNATIVES),
  wikimedia: resolve(ROOT, 'scripts/catalog/wikimedia-rounds.json'),
  output: resolve(ROOT, 'src/data/rounds.json'),
  previews: resolve(ROOT, 'public/previews/mapillary'),
  attributions: resolve(ROOT, 'ATTRIBUTIONS.md'),
}

const excludedMainIndexes = new Set([
  1, 2, 8, 12, 15, 17, 22, 24, 25, 31, 33, 39, 53, 73, 79, 85, 146, 169,
])
const includedMoreIndexes = [3, 4, 17, 27, 31, 34, 35, 39, 68, 69, 70, 71, 79, 80]
const replacementOptions = new Map([
  [5, 1],
  [103, 3],
  [193, 14],
])
const excludedWikimediaIds = new Set([
  'soissons-cathedral',
  'portuguese-synagogue',
  'iziko-ethnology',
])

function mapillaryRound(place, panorama) {
  return {
    id: `mapillary-${panorama.id}`,
    provider: 'mapillary',
    city: place.city,
    country: place.country,
    countryCode: place.countryCode,
    landmark: place.landmark,
    mapillaryImageId: panorama.id,
    previewUrl: `/previews/mapillary/${panorama.id}.jpg`,
    photographer: panorama.creator,
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: panorama.sourceUrl,
  }
}

async function downloadPreview(round, signedUrl) {
  const output = resolve(paths.previews, basename(round.previewUrl))
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Could not download preview for ${round.landmark}`)
  }
  await writeFile(output, Buffer.from(await response.arrayBuffer()))
}

async function concurrent(items, workers, callback) {
  let nextIndex = 0
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex
        nextIndex += 1
        await callback(items[index], index)
      }
    }),
  )
}

function attributionMarkdown(rounds) {
  const rows = rounds.map((round) => {
    const creator = round.photographer.replaceAll('|', '\\|')
    const landmark = round.landmark.replaceAll('|', '\\|')
    return `| ${landmark} | ${round.country} | [${creator}](${round.sourceUrl}) | [${round.license}](${round.licenseUrl}) |`
  })
  return [
    '# Panorama attributions',
    '',
    'PanoPassport uses only openly licensed panoramas. Mapillary images are',
    'displayed through MapillaryJS and retain Mapillary’s required in-view attribution.',
    '',
    '| Place | Country | Creator and source | License |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')
}

const [mainCatalog, moreCatalog, alternativesCatalog, wikimediaCatalog] =
  await Promise.all(
    [
      paths.main,
      paths.more,
      paths.alternatives,
      paths.wikimedia,
    ].map(async (path) => JSON.parse(await readFile(path, 'utf8'))),
  )

const alternativesByLandmark = new Map(
  alternativesCatalog.results.map((result) => [result.landmark, result]),
)
const selected = []

for (const [index, place] of mainCatalog.candidates.entries()) {
  const catalogIndex = index + 1
  if (excludedMainIndexes.has(catalogIndex)) continue

  let panorama = place.panorama
  const replacementOption = replacementOptions.get(catalogIndex)
  if (replacementOption) {
    panorama =
      alternativesByLandmark.get(place.landmark)?.alternatives[
        replacementOption - 1
      ]
    if (!panorama) {
      throw new Error(`Missing replacement for ${place.landmark}`)
    }
  }
  selected.push({ place, panorama })
}

for (const catalogIndex of includedMoreIndexes) {
  const place = moreCatalog.candidates[catalogIndex - 1]
  if (!place) throw new Error(`Missing expanded candidate ${catalogIndex}`)
  selected.push({ place, panorama: place.panorama })
}

const mapillaryRounds = selected.map(({ place, panorama }) =>
  mapillaryRound(place, panorama),
)
const wikimediaRounds = wikimediaCatalog
  .filter(({ id }) => !excludedWikimediaIds.has(id))
  .map((round) => ({ provider: 'wikimedia', ...round }))
const rounds = [...wikimediaRounds, ...mapillaryRounds]

if (rounds.length !== 200) {
  throw new Error(`Expected 200 rounds, built ${rounds.length}`)
}
if (new Set(rounds.map(({ id }) => id)).size !== rounds.length) {
  throw new Error('Catalog contains duplicate panorama IDs')
}

await mkdir(paths.previews, { recursive: true })
await concurrent(selected, 8, async ({ panorama }, index) => {
  await downloadPreview(mapillaryRounds[index], panorama.previewUrl)
  if ((index + 1) % 25 === 0) {
    console.log(`Downloaded ${index + 1}/${selected.length} previews`)
  }
})

await mkdir(dirname(paths.output), { recursive: true })
await writeFile(paths.output, `${JSON.stringify(rounds, null, 2)}\n`)
await writeFile(paths.attributions, attributionMarkdown(rounds))

const countryCount = new Set(rounds.map(({ countryCode }) => countryCode)).size
console.log(
  `Built ${rounds.length} outdoor rounds across ${countryCount} countries`,
)
