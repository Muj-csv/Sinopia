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
import { findStreetLevelImage, NEAR_RADIUS_M, type StreetLevelImage } from './streetLevel'

const MAPILLARY_TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN ?? ''

type Status = 'loading' | 'found' | 'none' | 'error'

export function StreetLevelPanel({ lat, lng }: { lat: number; lng: number }) {
  const [status, setStatus] = useState<Status>('loading')
  const [image, setImage] = useState<StreetLevelImage | null>(null)
  const mapillaryContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    findStreetLevelImage(lat, lng, MAPILLARY_TOKEN).then((outcome) => {
      if (cancelled) return
      setImage(outcome.status === 'found' ? outcome.image : null)
      setStatus(outcome.status)
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

  // UX_MAP.md: the error row is "Street-level view unavailable". Kept separate from the empty
  // copy below so a missing token or an unreachable provider never reads as an empty street.
  if (status === 'error') {
    return <p className="street-level-empty">Street-level view unavailable</p>
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
      {/* Close enough and it is simply the spot; further out, say so rather than imply the
          camera stood where the artist did. */}
      {image.distanceM > NEAR_RADIUS_M && (
        <p className="street-level-distance">
          Nearest street view, about {Math.round(image.distanceM / 10) * 10} m away.
        </p>
      )}
      <p className="street-level-credit">
        Street-level imagery © {image.provider === 'mapillary' ? 'Mapillary' : 'Panoramax'}{' '}
        contributors, CC BY-SA
      </p>
    </div>
  )
}
