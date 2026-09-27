/** Phase 0 task 6: globe spike. MapLibre v5+ globe projection, OpenFreeMap tiles, no key needed. */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

export function GlobePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [121.05, 14.6], // Metro Manila, near the team
      zoom: 1.5,
    })
    map.setProjection({ type: 'globe' })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '© OpenStreetMap contributors, tiles by OpenFreeMap',
      }),
    )
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="globe-map" aria-label="Globe" />
}
