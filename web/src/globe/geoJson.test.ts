import { describe, expect, it } from 'vitest'
import { findPoint, toFeatureCollection, type GlobePoint } from './geoJson'

const point: GlobePoint = {
  id: 'f1',
  title: 'A wall',
  thumb_path: 'u1/f1/thumb.webp',
  owner_id: 'u1',
  lng: 121.05,
  lat: 14.6,
}

describe('toFeatureCollection', () => {
  it('builds a Point feature per row, [lng, lat] order', () => {
    const fc = toFeatureCollection([point])
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [121.05, 14.6] })
    expect(fc.features[0].properties).toEqual({
      id: 'f1',
      title: 'A wall',
      thumb_path: 'u1/f1/thumb.webp',
      owner_id: 'u1',
    })
  })

  it('returns an empty collection for no points', () => {
    expect(toFeatureCollection([])).toEqual({ type: 'FeatureCollection', features: [] })
  })
})

describe('findPoint', () => {
  it('finds by id', () => {
    expect(findPoint([point], 'f1')).toEqual(point)
  })

  it('returns undefined when missing', () => {
    expect(findPoint([point], 'nope')).toBeUndefined()
  })
})
