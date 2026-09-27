/** PHASE-4 task 1: shapes rpc('globe_points') rows into a GeoJSON source for MapLibre clustering. */
export interface GlobePoint {
  id: string
  title: string
  thumb_path: string
  owner_id: string
  lng: number
  lat: number
}

export interface FrescoFeatureCollection {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    id: string
    properties: { id: string; title: string; thumb_path: string; owner_id: string }
    geometry: { type: 'Point'; coordinates: [number, number] }
  }[]
}

export function toFeatureCollection(points: readonly GlobePoint[]): FrescoFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: { id: p.id, title: p.title, thumb_path: p.thumb_path, owner_id: p.owner_id },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  }
}

export function findPoint(points: readonly GlobePoint[], id: string): GlobePoint | undefined {
  return points.find((p) => p.id === id)
}
