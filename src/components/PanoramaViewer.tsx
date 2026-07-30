import 'pannellum'
import { useEffect, useRef, useState } from 'react'
import { panoramaVerticalAngle, previewUrl } from '../lib/game'
import type { Round } from '../types'

type PanoramaViewerProps = {
  round: Round
}

export function PanoramaViewer({ round }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!containerRef.current) return

    setStatus('loading')
    const viewer = window.pannellum.viewer(containerRef.current, {
      type: 'equirectangular',
      panorama: round.panoramaUrl,
      preview: previewUrl(round.panoramaUrl),
      autoLoad: true,
      crossOrigin: 'anonymous',
      escapeHTML: true,
      haov: 360,
      vaov: panoramaVerticalAngle(round.imageWidth, round.imageHeight),
      yaw: round.initialYaw ?? 0,
      pitch: round.initialPitch ?? 0,
      hfov: 96,
      minHfov: 45,
      maxHfov: 120,
      showControls: true,
      showFullscreenCtrl: true,
      compass: false,
      strings: {
        loadingLabel: 'Loading the 360° view…',
        genericWebGLError: 'This device cannot show the interactive panorama.',
      },
    })

    viewer.on('load', () => setStatus('ready'))
    viewer.on('error', () => setStatus('error'))
    return () => viewer.destroy()
  }, [round])

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
          <img src={previewUrl(round.panoramaUrl)} alt="" />
          <p>The interactive view could not load.</p>
          <a href={round.sourceUrl} target="_blank" rel="noreferrer">
            Open the original panorama
          </a>
        </div>
      )}
    </section>
  )
}
