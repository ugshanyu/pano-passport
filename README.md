# PanoPassport

A free five-round geography game built around real, interactive 360° panoramas.
Look around, read the visual clues, and choose the country.

## What is included

- 14 verified countries across five continents
- Full and partial equirectangular 360° panorama support
- Five randomized rounds with country-based scoring
- Desktop, phone, keyboard, touch, zoom, and fullscreen support
- Local personal-best storage when played outside Usion
- Usion friends and worldwide leaderboards when opened inside the host app
- Visible creator, source, and reuse-license attribution on every round
- Loading, rendering-error, and static-preview fallbacks

## Zero-cost architecture

The app does not use Google Maps, a Google Cloud billing account, or another
billable map service.

- [Pannellum](https://pannellum.org/) renders panoramas under the MIT License.
- [Wikimedia Commons](https://commons.wikimedia.org/) hosts the imagery.
- Each image is CC0, CC BY, or CC BY-SA and links to its original file page.
- [country-list](https://www.npmjs.com/package/country-list) supplies country names under MIT.
- Vite builds a static site that can run on Vercel's free tier.

Open 360° coverage is uneven. The app only counts a country after a genuine
panorama and its license have been checked; it does not disguise flat photos as
360° content. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for the current catalog.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run test
npm run build
```

## Add a panorama

Add one record to `src/data/rounds.json` with:

- a stable Wikimedia thumbnail URL and source page
- country code, country name, city, and landmark
- original width and height
- creator, reuse license, and license URL
- optional initial yaw and pitch

Confirm the image is a real 360° equirectangular or cylindrical panorama and
that browser requests return an image with cross-origin access. Attribution
must remain visible in both gameplay and the catalog.

## Deployment

The production build is the `dist` folder. Vercel can deploy this Vite project
without server functions or environment variables.

Inside Usion, the game waits for the official SDK host handshake, starts the
first round immediately, and submits only completed five-round scores.
