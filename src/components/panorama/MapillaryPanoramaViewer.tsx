import { CameraControls, Viewer } from 'mapillary-js'
import 'mapillary-js/dist/mapillary.css'
import { useEffect, useRef, useState } from 'react'
import type { MapillaryRound } from '../../types'

type MapillaryPanoramaViewerProps = {
  round: MapillaryRound
}

export function MapillaryPanoramaViewer({
  round,
}: MapillaryPanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const container = containerRef.current
    const accessToken = import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN
    if (!container || !accessToken) {
      setStatus('error')
      return
    }

    setStatus('loading')
    let active = true
    let viewer: Viewer | undefined

    const initialize = window.setTimeout(() => {
      try {
        viewer = new Viewer({
          accessToken,
          cameraControls: CameraControls.Street,
          container,
          imageId: round.mapillaryImageId,
          component: {
            attribution: true,
            bearing: false,
            cache: false,
            cover: false,
            direction: false,
            sequence: false,
            spatial: false,
          },
        })
        viewer.on('load', () => {
          if (active) setStatus('ready')
        })
      } catch {
        setStatus('error')
      }
    })

    const timeout = window.setTimeout(() => {
      if (active) setStatus((current) => (current === 'loading' ? 'error' : current))
    }, 20_000)

    return () => {
      active = false
      window.clearTimeout(initialize)
      window.clearTimeout(timeout)
      viewer?.remove()
    }
  }, [round.mapillaryImageId])

  return (
    <section className="panorama-shell" aria-label="Interactive 360 degree panorama">
      <div ref={containerRef} className="panorama-viewer" />
      {status === 'loading' && (
        <div className="panorama-status" aria-live="polite">
          <span />
          Loading open 360° panorama
        </div>
      )}
      {status === 'ready' && (
        <p className="panorama-hint">Drag to look around · Scroll or pinch to zoom</p>
      )}
      {status === 'error' && (
        <div className="panorama-fallback" role="alert">
          <img src={round.previewUrl} alt="" />
          <p>The interactive view could not load.</p>
          <a href={round.sourceUrl} target="_blank" rel="noreferrer">
            Open the original panorama
          </a>
        </div>
      )}
    </section>
  )
}
