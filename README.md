# PanoPassport

A free five-round geography game built around real, interactive 360° panoramas.
Look around, read the visual clues, and choose the country.

## What is included

- 200 curated outdoor locations across 73 countries
- Full and partial equirectangular 360° panorama support
- Five randomized rounds with four country choices and distance-based scoring
- Desktop, phone, keyboard, touch, zoom, and fullscreen support
- Local personal-best storage when played outside Usion
- Usion friends and worldwide leaderboards when opened inside the host app
- Visible creator, source, and reuse-license attribution on every round
- Loading, rendering-error, and static-preview fallbacks

## Zero-cost architecture

The app does not use Google Maps, a Google Cloud billing account, or another
billable map service.

- [Pannellum](https://pannellum.org/) renders Wikimedia panoramas under the MIT License.
- [MapillaryJS](https://mapillary.github.io/mapillary-js/) renders Mapillary
  panoramas under the MIT License.
- [Wikimedia Commons](https://commons.wikimedia.org/) and
  [Mapillary](https://www.mapillary.com/) provide the openly licensed imagery.
- Each image is CC0, CC BY, or CC BY-SA and links to its original source.
- [world-countries](https://github.com/mledoze/countries) supplies geographic
  country reference points under ODbL 1.0.
- Vite builds a static site that can run on Vercel's free tier.

Open 360° coverage is uneven. The app only counts a country after a genuine
panorama and its license have been checked; it does not disguise flat photos as
360° content. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for the current catalog.

Correct answers earn 1,000 points. Wrong answers earn up to 750 points and
decrease with the distance from the landmark to the selected country's
geographic reference point.

## Run locally

```bash
npm install
export VITE_MAPILLARY_ACCESS_TOKEN="your read-only client token"
npm run dev
```

The token is a Mapillary client access token intended for browser use. Never
place the Mapillary client secret in this project.

## Verify

```bash
npm run lint
npm run test
npm run build
```

## Maintain the catalog

The checked Wikimedia seed catalog lives in
`scripts/catalog/wikimedia-rounds.json`. Mapillary discovery and selection use:

```bash
npm run catalog:discover
npm run catalog:alternatives
npm run catalog:build
```

Every selected image must be a genuine outdoor panorama with valid location
metadata. Review the generated previews before rebuilding. Attribution must
remain visible in gameplay and in `ATTRIBUTIONS.md`.

## Deployment

The production build is the `dist` folder. Vercel hosts it as a static Vite
site with `VITE_MAPILLARY_ACCESS_TOKEN` configured for Production.

Inside Usion, the game waits for the official SDK host handshake, starts the
first round immediately, and submits only completed five-round scores.

- Play: https://pano-passport.vercel.app
- Usion: https://usions.com/chat/iframe/pano-passport

The square Usion catalog artwork is `public/game-icon.png`; the wider social
sharing card remains `public/og.jpg`.
