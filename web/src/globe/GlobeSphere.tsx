/**
 * One account's world, drawn as an actual globe: real OpenStreetMap data in globe projection,
 * inked to match the rest of the app, carrying only that account's frescoes.
 *
 * It is a whole MapLibre map, which is also why the system view caps how many exist at once --
 * each one holds a WebGL context, and a browser drops the oldest once there are too many.
 *
 * Deliberately not interactive. In the system view you are looking at worlds from outside; you
 * pick one, and navigating it happens after you arrive. That also keeps a drag on the system view
 * meaning "drag the system", never "accidentally spin a planet".
 */
import * as maplibregl from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import '../lib/maplibreWorker'
import { toFeatureCollection, type GlobePoint } from './geoJson'
import { applyInkStyle } from './inkStyle'
import { loadMapStyle } from './mapStyle'
import { centreOf } from './sinopias'

const SOURCE_ID = 'frescoes'

/**
 * A full turn every 72 seconds. The first version ran at 0.3 deg/s -- a twenty-minute rotation,
 * which is real motion that nobody can see, and the system read as a still picture. This is slow
 * enough to stay calm and fast enough that a glance catches it.
 */
const SPIN_DEGREES_PER_SECOND = 5

/**
 * Roughly the diameter, in CSS pixels, that MapLibre draws the globe at zoom 0. The sphere is a
 * fixed size on screen whatever the container is, so a big container at zoom 0 gets a small globe
 * marooned in the middle of it.
 */
const SPHERE_AT_ZOOM_0 = 150

/** The zoom that makes the sphere fill a container of this size, and slightly overflow it. */
function zoomToFill(size: number): number {
  return Math.max(0, Math.log2(size / SPHERE_AT_ZOOM_0))
}

function themeColor(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value === '' ? fallback : value
}

export function GlobeSphere({
  points,
  size,
  spin = false,
  spinSpeed = SPIN_DEGREES_PER_SECOND,
}: {
  points: readonly GlobePoint[]
  size: number
  /** Whether this world turns on its axis. */
  spin?: boolean
  /** Degrees per second, so each world in the sky can turn at its own rate. */
  spinSpeed?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [failed, setFailed] = useState(false)
  const [centreLng, centreLat] = centreOf(points)

  // Built once per mount. The points are pushed in through the effect below rather than rebuilding
  // the map, because tearing down a WebGL context to change a dot is enormously wasteful.
  useEffect(() => {
    let cancelled = false
    loadMapStyle()
      .then((style) => {
        if (cancelled || containerRef.current === null) return
        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [centreLng, centreLat],
          zoom: zoomToFill(size),
          interactive: false,
          // One credit line covers the whole system; a control per sphere would stack up.
          attributionControl: false,
          fadeDuration: 0,
          // Nothing here is read at a glance, and the labels cost tiles and draw calls.
          maxZoom: 3,
        })
        mapRef.current = map

        map.on('error', () => setFailed(true))
        map.on('load', () => {
          if (cancelled) return
          applyInkStyle(map)
          map.setProjection({ type: 'globe' })

          map.addSource(SOURCE_ID, { type: 'geojson', data: toFeatureCollection([...points]) })
          // Dots, not thumbnails: at this size a fresco's artwork is a smudge, and what matters
          // from outside is where the world has been drawn on and how much.
          map.addLayer({
            id: 'fresco-dots',
            type: 'circle',
            source: SOURCE_ID,
            paint: {
              'circle-color': themeColor('--yellow', '#FFD139'),
              'circle-radius': 3,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': themeColor('--ink', '#1A1A1A'),
            },
          })
        })
      })
      .catch(() => setFailed(true))

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Centre and points are applied by the effects below; rebuilding the map on either would
    // throw away a WebGL context on every data tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // New frescoes land on the existing sphere.
  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    source?.setData(toFeatureCollection([...points]))
  }, [points])

  useEffect(() => {
    mapRef.current?.jumpTo({ center: [centreLng, centreLat] })
  }, [centreLng, centreLat])

  /**
   * The turn of a world on its axis. Rotating the camera rather than animating CSS keeps it a
   * real globe rather than a spinning picture of one, and it stops for anyone who asked for less
   * motion.
   *
   * Degrees per second, not per frame: tying the step to elapsed time means a world turns at the
   * same rate on a 120Hz screen as on a struggling phone, instead of twice as fast.
   */
  useEffect(() => {
    if (!spin) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let last = performance.now()
    const step = (now: number) => {
      const map = mapRef.current
      if (map !== null) {
        const centre = map.getCenter()
        map.setCenter([centre.lng + ((now - last) / 1000) * spinSpeed, centre.lat])
      }
      last = now
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [spin, spinSpeed])

  return (
    <div
      ref={containerRef}
      className={failed ? 'globe-sphere failed' : 'globe-sphere'}
      style={{ width: size, height: size }}
    />
  )
}
