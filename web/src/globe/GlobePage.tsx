/**
 * PHASE-4 task 1: MapLibre globe with clustered pins of public frescoes
 * (rpc('globe_points')), tap cluster to zoom, tap pin for a preview card,
 * Photon place search. Phase 0's base globe spike, extended.
 */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import './globe.css'
import { toFeatureCollection, type GlobePoint } from './geoJson'
import { loadGlobePoints } from './loadGlobePoints'
import { PlaceSearch } from './PlaceSearch'
import type { PlaceResult } from './photonSearch'
import { PreviewCard } from './PreviewCard'

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const SOURCE_ID = 'frescoes'

function themeColor(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value === '' ? fallback : value
}

type Status = 'loading' | 'ready' | 'error'

export function GlobePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const pointsRef = useRef<GlobePoint[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [selected, setSelected] = useState<GlobePoint | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [121.05, 14.6],
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

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      const clusterColor = themeColor('--color-accent-3', '#2F3B4C')
      const pinColor = themeColor('--color-accent-2', '#CB410B')

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': clusterColor,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
          'circle-opacity': 0.85,
        },
      })
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
        paint: { 'text-color': '#fff' },
      })
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': pinColor,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
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

      map.on('click', 'unclustered-point', (e) => {
        const id = e.features?.[0]?.properties?.id
        const point = pointsRef.current.find((p) => p.id === id)
        if (point !== undefined) setSelected(point)
      })

      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''))
      map.on('mouseenter', 'unclustered-point', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'unclustered-point', () => (map.getCanvas().style.cursor = ''))

      loadGlobePoints().then(({ points, error }) => {
        if (error) {
          setStatus('error')
          return
        }
        pointsRef.current = points
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
        source.setData(toFeatureCollection(points))
        setStatus('ready')
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  const flyTo = (place: PlaceResult) => {
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 12 })
  }

  return (
    <div className="globe-container">
      <div ref={containerRef} className="globe-map" aria-label="Globe" />
      <div className="globe-search">
        <PlaceSearch onSelect={flyTo} />
      </div>
      {status === 'loading' && <p className="globe-status">Loading the gallery...</p>}
      {status === 'error' && <p className="globe-status" role="alert">The gallery is waking up.</p>}
      {status === 'ready' && pointsRef.current.length === 0 && (
        <p className="globe-status">The world is blank. Be the first to leave a fresco.</p>
      )}
      {selected !== null && <PreviewCard point={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
