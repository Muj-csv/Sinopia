/** MapLibre mini-map with a draggable marker, same no-key OpenFreeMap setup as GlobePage.tsx. */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import '../lib/maplibreWorker'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const DEFAULT_CENTER: [number, number] = [121.05, 14.6] // Metro Manila fallback

export function PinPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: [number, number] = lat !== null && lng !== null ? [lng, lat] : DEFAULT_CENTER
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center,
      zoom: 15,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '© OpenStreetMap contributors, tiles by OpenFreeMap',
      }),
    )

    const marker = new maplibregl.Marker({ draggable: true }).setLngLat(center).addTo(map)
    marker.on('dragend', () => {
      const { lat: newLat, lng: newLng } = marker.getLngLat()
      onChangeRef.current(newLat, newLng)
    })
    map.on('click', (e) => {
      marker.setLngLat(e.lngLat)
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Only re-init on mount; lat/lng updates from outside move the marker via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lat === null || lng === null || markerRef.current === null) return
    markerRef.current.setLngLat([lng, lat])
  }, [lat, lng])

  return <div ref={containerRef} className="pin-picker-map" aria-label="Pick location on map" />
}
