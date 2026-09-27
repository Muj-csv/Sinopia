/**
 * PHASE-5a task 1 (FR-015): street-level view beside the fresco. Never
 * rendered for `neighborhood` precision (checked by the caller, not
 * here, since "never shown" is a property of the fresco, not this
 * component's own state). Mapillary first (MapillaryJS viewer, lazy-
 * loaded), Panoramax fallback (static image + link -- MapillaryJS is
 * Mapillary-specific; a dedicated Panoramax viewer wasn't in scope),
 * else nothing.
 */
import { useEffect, useRef, useState } from 'react'
import 'mapillary-js/dist/mapillary.css'
import { findStreetLevelImage, type StreetLevelImage } from './streetLevel'

const MAPILLARY_TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN ?? ''

type Status = 'loading' | 'found' | 'none'

export function StreetLevelPanel({ lat, lng }: { lat: number; lng: number }) {
  const [status, setStatus] = useState<Status>('loading')
  const [image, setImage] = useState<StreetLevelImage | null>(null)
  const mapillaryContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    findStreetLevelImage(lat, lng, MAPILLARY_TOKEN).then((found) => {
      if (cancelled) return
      setImage(found)
      setStatus(found === null ? 'none' : 'found')
    })
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  useEffect(() => {
    if (image?.provider !== 'mapillary' || mapillaryContainerRef.current === null) return
    let viewer: import('mapillary-js').Viewer | undefined
    let cancelled = false
    import('mapillary-js').then(({ Viewer }) => {
      if (cancelled || mapillaryContainerRef.current === null) return
      viewer = new Viewer({
        container: mapillaryContainerRef.current,
        imageId: image.id,
        accessToken: MAPILLARY_TOKEN,
      })
    })
    return () => {
      cancelled = true
      viewer?.remove()
    }
  }, [image])

  if (status === 'loading') {
    return <div className="street-level-panel street-level-loading">Loading street view...</div>
  }

  if (status === 'none' || image === null) {
    return <p className="street-level-empty">No street-level imagery here yet.</p>
  }

  return (
    <div className="street-level-panel">
      {image.provider === 'mapillary' ? (
        <div ref={mapillaryContainerRef} className="street-level-viewer" />
      ) : (
        <a href={image.imageUrl} target="_blank" rel="noreferrer noopener">
          <img
            src={image.imageUrl}
            alt="Street-level view of the spot"
            className="street-level-image"
          />
        </a>
      )}
      <p className="street-level-credit">
        Street-level imagery © {image.provider === 'mapillary' ? 'Mapillary' : 'Panoramax'}{' '}
        contributors, CC BY-SA
      </p>
    </div>
  )
}
