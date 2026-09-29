/**
 * PHASE-4 task 1: MapLibre globe with clustered pins of public frescoes
 * (rpc('globe_points')), tap cluster to zoom, tap pin for a preview card,
 * Photon place search. Phase 0's base globe spike, extended.
 *
 * The fresco fetch and the map are deliberately independent: if MapLibre can't start (no WebGL,
 * tiles unreachable, style 404) the screen still has rows to show, which is the "map fails" state
 * in SCREENS.md - a notice plus a plain list.
 */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import '../lib/maplibreWorker'
import { Icon } from '../ui/Icon'
import './globe.css'
import { toFeatureCollection, type GlobePoint } from './geoJson'
import { createFrescoPin } from './frescoPin'
import { GlobeFallbackList } from './GlobeFallbackList'
import { applyInkStyle } from './inkStyle'
import { loadGlobePoints } from './loadGlobePoints'
import { PlaceSearch } from './PlaceSearch'
import type { PlaceResult } from './photonSearch'
import { PreviewCard } from './PreviewCard'
import { useSession } from '../lib/useSession'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const SOURCE_ID = 'frescoes'

function themeColor(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value === '' ? fallback : value
}

type DataStatus = 'loading' | 'ready' | 'error'
type MapStatus = 'loading' | 'ready' | 'failed'

export function GlobePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const pointsRef = useRef<GlobePoint[]>([])
  const [points, setPoints] = useState<GlobePoint[]>([])
  const [dataStatus, setDataStatus] = useState<DataStatus>('loading')
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading')
  const [selected, setSelected] = useState<GlobePoint | null>(null)
  /** One marker per visible unclustered fresco, keyed by id so we only build each once. */
  const pinsRef = useRef(new Map<string, maplibregl.Marker>())
  const { session } = useSession()
  /** Read inside the marker factory, which runs outside React's render. */
  const myIdRef = useRef<string | null>(null)
  useEffect(() => {
    myIdRef.current = session?.user.id ?? null
  }, [session])

  /**
   * Reconciles the markers on screen with the frescoes the source currently exposes. Clusters are
   * drawn by MapLibre as yellow circles; everything unclustered becomes its own artwork.
   */
  const syncPins = useCallback((map: maplibregl.Map) => {
    const features = map.querySourceFeatures(SOURCE_ID, {
      filter: ['!', ['has', 'point_count']],
    })

    const onScreen = new Set<string>()
    for (const feature of features) {
      const id = feature.properties?.id
      if (typeof id !== 'string' || feature.geometry.type !== 'Point') continue
      onScreen.add(id)
      if (pinsRef.current.has(id)) continue

      const point = pointsRef.current.find((p) => p.id === id)
      if (point === undefined) continue

      const marker = new maplibregl.Marker({
        element: createFrescoPin(point, {
          mine: point.owner_id === myIdRef.current,
          onSelect: setSelected,
        }),
      })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .addTo(map)
      pinsRef.current.set(id, marker)
    }

    // A fresco that scrolled away or folded back into a cluster loses its marker, otherwise they
    // accumulate for every tile ever loaded.
    for (const [id, marker] of pinsRef.current) {
      if (onScreen.has(id)) continue
      marker.remove()
      pinsRef.current.delete(id)
    }
  }, [])

  // Frescoes first, on their own. This runs whatever the map does.
  useEffect(() => {
    let cancelled = false
    loadGlobePoints().then(({ points: loaded, error }) => {
      if (cancelled) return
      pointsRef.current = loaded
      setPoints(loaded)
      setDataStatus(error ? 'error' : 'ready')
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: OPENFREEMAP_STYLE,
        center: [121.05, 14.6],
        zoom: 1.5,
        // MapLibre adds its own attribution control unless told not to; with the explicit one below
        // that renders two stacked credit bars (NFR-004 wants one, always visible).
        attributionControl: false,
      })
    } catch {
      // Constructing the map throws when the device has no usable WebGL context. Report it on the
      // next tick rather than synchronously, so this is a message from an external system landing
      // in a callback instead of a cascading render inside the effect body.
      queueMicrotask(() => setMapStatus('failed'))
      return
    }

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(
      new maplibregl.AttributionControl({
        customAttribution: '© OpenStreetMap contributors, tiles by OpenFreeMap',
      }),
    )
    mapRef.current = map

    // Errors after the style is up are transient (a tile that 404s, a request that times out) and
    // must not tear down a working map. Only a failure to ever load counts as "the map failed".
    map.on('error', () => {
      setMapStatus((current) => (current === 'loading' ? 'failed' : current))
    })

    map.on('load', () => {
      // setProjection throws "Style is not done loading" if called before
      // the style is ready -- confirmed via manual testing, crashes the
      // whole React root since there's no error boundary.
      map.setProjection({ type: 'globe' })
      applyInkStyle(map)

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        // Wider than the default: a 44px thumbnail needs more room than a dot before two of them
        // collide, and overlapping artwork is harder to read than one cluster with a count.
        clusterRadius: 64,
      })

      // Clusters are the signature yellow with an ink edge and an ink count. Yellow is a fill with
      // ink on it, never a thin line (DESIGN_BRIEF.md §3). Single frescoes are HTML markers below.
      const yellow = themeColor('--yellow', '#FFD139')
      const ink = themeColor('--ink', '#1A1A1A')

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': yellow,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
          'circle-stroke-width': 2,
          'circle-stroke-color': ink,
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 14 },
        paint: { 'text-color': ink },
      })
      // Single frescoes are drawn as HTML markers showing the artwork itself (see syncPins), so
      // this layer renders nothing. It stays because querySourceFeatures reads the source's loaded
      // tiles, and a source with no layer referencing it is never tiled.
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 0, 'circle-opacity': 0, 'circle-stroke-width': 0 },
      })

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0]?.properties?.cluster_id
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
        if (clusterId === undefined) return
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = features[0].geometry
          if (geometry.type !== 'Point') return
          map.easeTo({ center: geometry.coordinates as [number, number], zoom })
        })
      })

      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''))

      // Markers follow whatever the source currently holds, which changes as tiles load and as
      // clusters split, so this runs on render rather than once.
      map.on('render', () => {
        if (!map.isSourceLoaded(SOURCE_ID)) return
        syncPins(map)
      })

      setMapStatus('ready')
    })

    // Captured here rather than read in the cleanup: the ref could point at a different Map by
    // the time this effect tears down, and the markers to remove are the ones this map made.
    const pins = pinsRef.current
    return () => {
      for (const marker of pins.values()) marker.remove()
      pins.clear()
      map.remove()
      mapRef.current = null
    }
  }, [syncPins])

  // Whichever of the two finishes last puts the frescoes on the map.
  useEffect(() => {
    if (mapStatus !== 'ready' || dataStatus !== 'ready') return
    const source = mapRef.current?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    source?.setData(toFeatureCollection(points))
  }, [mapStatus, dataStatus, points])

  const flyTo = (place: PlaceResult) => {
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 12 })
  }

  const mapFailed = mapStatus === 'failed'

  return (
    <div className="globe-container">
      <div ref={containerRef} className="globe-map" aria-label="Globe" hidden={mapFailed} />

      {mapFailed ? (
        <GlobeFallbackList points={points} dataFailed={dataStatus === 'error'} />
      ) : (
        <>
          <div className="globe-search">
            <PlaceSearch onSelect={flyTo} />
          </div>
          {(mapStatus === 'loading' || dataStatus === 'loading') && (
            <p className="globe-status">Loading the gallery&hellip;</p>
          )}
          {dataStatus === 'error' && (
            <p className="globe-status notice" role="alert">
              <Icon name="warn" />
              The gallery is waking up.
            </p>
          )}
          {dataStatus === 'ready' && points.length === 0 && (
            <p className="globe-status">The world is blank. Be the first to leave a fresco.</p>
          )}
          {selected !== null && <PreviewCard point={selected} onClose={() => setSelected(null)} />}
        </>
      )}
    </div>
  )
}
