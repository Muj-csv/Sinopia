/** FR-010: "a small map of the spot" -- read-only, public point only. Reuses globe_points (no new SQL). */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

export function SpotMap({ lng, lat }: { lng: number; lat: number }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current === null) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [lng, lat],
      zoom: 14,
      interactive: false,
    })
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '© OpenStreetMap contributors, tiles by OpenFreeMap',
      }),
    )
    new maplibregl.Marker().setLngLat([lng, lat]).addTo(map)
    return () => map.remove()
  }, [lng, lat])

  return <div ref={containerRef} className="spot-map" aria-label="Map of the spot" />
}
