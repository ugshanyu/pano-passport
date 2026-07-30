import { lazy, Suspense } from 'react'
import type { Round } from '../types'
import { WikimediaPanoramaViewer } from './panorama/WikimediaPanoramaViewer'

const MapillaryPanoramaViewer = lazy(async () => {
  const module = await import('./panorama/MapillaryPanoramaViewer')
  return { default: module.MapillaryPanoramaViewer }
})

type PanoramaViewerProps = {
  round: Round
}

export function PanoramaViewer({ round }: PanoramaViewerProps) {
  if (round.provider === 'mapillary') {
    return (
      <Suspense
        fallback={
          <section className="panorama-shell" aria-label="Loading 360 degree panorama">
            <div className="panorama-status" aria-live="polite">
              <span />
              Loading open 360° viewer
            </div>
          </section>
        }
      >
        <MapillaryPanoramaViewer round={round} />
      </Suspense>
    )
  }

  return <WikimediaPanoramaViewer round={round} />
}
