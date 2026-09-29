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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../lib/maplibreWorker'
import { supabase } from '../lib/supabase'
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
import { SinopiaOrbit } from './SinopiaOrbit'
import { loadSinopias, type Sinopia } from './sinopiaDirectory'
import { SpaceLayer } from './SpaceLayer'
import { flyToPlace, warpTo } from './warp'
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
  const navigate = useNavigate()
  const myId = session?.user.id ?? null
  /** Set on /s/:userId -- we are looking at someone else's world rather than the whole Earth. */
  const { userId: visitingId } = useParams<{ userId: string }>()
  const [artist, setArtist] = useState<{ id: string; name: string } | null>(null)
  /** Every account that has a globe, so the others can orbit the one you are in. */
  const [sinopias, setSinopias] = useState<Sinopia[]>([])
  /** Drives how many worlds the orbit shows; a phone cannot hold the whole ring. */
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
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

  /**
   * Every account has its own globe, and no globe ever mixes two artists' work.
   *
   * `currentOwner` is whose world is on screen: the artist named in the URL when visiting, and
   * your own otherwise. A signed-out visitor owns no globe, so there is nothing to show until
   * they pick one out of the orbit -- which is the point, rather than dropping everybody's
   * frescoes onto one shared sphere.
   */
  const currentOwner = visitingId ?? myId
  const visiblePoints = useMemo(
    () => (currentOwner === null ? [] : points.filter((p) => p.owner_id === currentOwner)),
    [points, currentOwner],
  )

  /** The other worlds: every artist with a globe of their own, excluding the one you are in. */
  const otherSinopias = useMemo(
    () => sinopias.filter((s) => s.ownerId !== currentOwner),
    [sinopias, currentOwner],
  )

  // Whose world this is. globe_points carries owner_id but no name, so the name is its own read.
  // The id is stored alongside the name rather than cleared on the way out: that keeps the effect
  // free of a synchronous setState, and means moving straight from one artist to another shows
  // nothing rather than briefly showing the previous artist's name over the new one's frescoes.
  useEffect(() => {
    if (visitingId === undefined) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', visitingId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setArtist({ id: visitingId, name: data?.display_name ?? 'An artist' })
      })
    return () => {
      cancelled = true
    }
  }, [visitingId])

  const visitingName = artist !== null && artist.id === visitingId ? artist.name : null

  // Frescoes first, on their own. This runs whatever the map does.
  useEffect(() => {
    let cancelled = false
    loadGlobePoints().then(async ({ points: loaded, error }) => {
      if (cancelled) return
      pointsRef.current = loaded
      setPoints(loaded)
      setDataStatus(error ? 'error' : 'ready')
      // The worlds are derived from the same points, so this costs one profiles read rather than
      // a second trip for the map data.
      const worlds = await loadSinopias(loaded)
      if (!cancelled) setSinopias(worlds)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // The orbit thins out on a narrow screen, so it has to know when the screen changes.
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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
    source?.setData(toFeatureCollection(visiblePoints))
  }, [mapStatus, dataStatus, visiblePoints])

  // Travelling to someone's Sinopia means arriving somewhere they have drawn. Their most recent
  // fresco is the closest thing we have to "where they are", and globe_points is already in
  // published order, so it is the first one through the filter.
  useEffect(() => {
    if (visitingId === undefined || mapStatus !== 'ready') return
    const first = visiblePoints[0]
    if (first === undefined) return
    warpTo(mapRef.current, first.lng, first.lat)
    // Only when the destination changes: re-running on every filter tick would yank the camera
    // back while someone is looking around.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitingId, mapStatus])

  const flyTo = (place: PlaceResult) => flyToPlace(mapRef.current, place.lng, place.lat)

  /**
   * Travel to another world. The camera leaves first and the route changes with it, so the arc
   * plays over the globe you are leaving rather than over an empty map -- the swap of pins
   * happens mid-flight, which is what makes it read as arriving somewhere.
   */
  const visit = (sinopia: Sinopia) => {
    warpTo(mapRef.current, sinopia.arrival.lng, sinopia.arrival.lat)
    navigate(`/s/${sinopia.ownerId}`)
  }

  const mapFailed = mapStatus === 'failed'

  return (
    <div className="globe-container">
      <div ref={containerRef} className="globe-map" aria-label="Globe" hidden={mapFailed} />

      {mapFailed ? (
        <GlobeFallbackList points={visiblePoints} dataFailed={dataStatus === 'error'} />
      ) : (
        <>
          <div className="globe-search">
            <PlaceSearch onSelect={flyTo} />
          </div>

          {/* The other worlds, around the edge of this one. */}
          <SinopiaOrbit sinopias={otherSinopias} width={viewportWidth} onVisit={visit} />

          {visitingId !== undefined && (
            <div className="globe-visiting">
              <p>
                <span className="t-small">You are in</span>
                <strong>{visitingName ?? 'a Sinopia'}</strong>
              </p>
              <Link className="btn-o" to="/">
                Back to your Sinopia
              </Link>
            </div>
          )}

          <SpaceLayer />
          {(mapStatus === 'loading' || dataStatus === 'loading') && (
            <p className="globe-status">Loading the gallery&hellip;</p>
          )}
          {dataStatus === 'error' && (
            <p className="globe-status notice" role="alert">
              <Icon name="warn" />
              The gallery is waking up.
            </p>
          )}
          {/* Four different emptinesses, and only one of them is the artist's fault. */}
          {dataStatus === 'ready' && visiblePoints.length === 0 && (
            <p className="globe-status">
              {visitingId !== undefined
                ? 'This artist has not published a fresco yet.'
                : myId === null
                  ? otherSinopias.length > 0
                    ? 'Pick a Sinopia to visit, or sign in to start your own.'
                    : 'Nobody has published a fresco yet.'
                  : 'Your Sinopia is empty. Publish a fresco to put it on your globe.'}
            </p>
          )}
          {selected !== null && <PreviewCard point={selected} onClose={() => setSelected(null)} />}
        </>
      )}
    </div>
  )
}
