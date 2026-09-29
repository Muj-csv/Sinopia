/** FR-010: "a small map of the spot" -- read-only, public point only. Reuses globe_points (no new SQL). */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import '../lib/maplibreWorker'
import { applyInkStyle } from '../globe/inkStyle'

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
      // MapLibre adds its own attribution control unless told not to, and the one below would then
      // be a second bar. On a map this small two stacked credit lines cover the map itself.
      attributionControl: false,
    })
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '© OpenStreetMap contributors, tiles by OpenFreeMap',
        // Collapsed to an "i" the reader can open. The credit stays one tap away, as the licence
        // requires, without taking a third of a small map to say so.
        compact: true,
      }),
    )
    map.on('style.load', () => applyInkStyle(map))

    // The marker is the app's own ink-and-paper pin rather than MapLibre's default teardrop.
    const pin = document.createElement('div')
    pin.className = 'spot-map-pin'
    new maplibregl.Marker({ element: pin }).setLngLat([lng, lat]).addTo(map)

    return () => map.remove()
  }, [lng, lat])

  return <div ref={containerRef} className="spot-map" aria-label="Map of the spot" />
}
