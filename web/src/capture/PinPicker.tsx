/**
 * Full-bleed MapLibre map with a FIXED centre pin: you drag the map, not the pin
 * (SCREENS.md "Pin check"). On a phone that matters -- dragging a marker puts your finger on top
 * of the thing you're trying to place, and the centre of the screen is always visible.
 *
 * Same no-key OpenFreeMap setup as GlobePage.tsx, restyled with the same ink pass.
 */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import '../lib/maplibreWorker'
import { applyInkStyle } from '../globe/inkStyle'
import { Icon } from '../ui/Icon'

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
  const onChangeRef = useRef(onChange)
  /** Set while we're recentring the map ourselves, so the moveend it causes isn't read as a drag. */
  const programmaticRef = useRef(false)

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
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '© OpenStreetMap contributors, tiles by OpenFreeMap',
      }),
    )
    map.on('style.load', () => applyInkStyle(map))

    // The pin is painted at the centre of the viewport, so wherever the map settles IS the pin.
    map.on('moveend', () => {
      if (programmaticRef.current) {
        programmaticRef.current = false
        return
      }
      const { lat: newLat, lng: newLng } = map.getCenter()
      onChangeRef.current(newLat, newLng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Only re-init on mount; coordinates set from outside recentre via the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Use my location" and the initial EXIF fix arrive as prop changes, not as drags.
  useEffect(() => {
    const map = mapRef.current
    if (lat === null || lng === null || map === null) return
    const current = map.getCenter()
    // Recentring on a value the map already holds would loop through moveend.
    if (Math.abs(current.lat - lat) < 1e-7 && Math.abs(current.lng - lng) < 1e-7) return
    programmaticRef.current = true
    map.easeTo({ center: [lng, lat] })
  }, [lat, lng])

  return (
    <div className="pin-picker">
      <div
        ref={containerRef}
        className="pin-picker-map"
        aria-label="Drag the map to place the pin"
      />
      {/* Sits above the map centre and ignores pointers, so dragging goes through to the map. */}
      <div className="centerpin" aria-hidden="true">
        <Icon name="bigpin" className="centerpin-icon" />
      </div>
    </div>
  )
}
