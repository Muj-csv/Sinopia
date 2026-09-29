import { describe, expect, it } from 'vitest'
import { groupByOwner } from './sinopias'
import type { GlobePoint } from './geoJson'

/** globe_points returns published-descending, which is what makes the first point the arrival. */
function point(id: string, owner: string, lng = 121, lat = 14): GlobePoint {
  return { id, owner_id: owner, title: id, thumb_path: `${owner}/${id}.webp`, lng, lat }
}

describe('groupByOwner', () => {
  it('gives every artist their own world', () => {
    const worlds = groupByOwner([point('a1', 'ana'), point('b1', 'ben'), point('a2', 'ana')])
    expect([...worlds.keys()].sort()).toEqual(['ana', 'ben'])
  })

  it('never mixes two artists onto one globe', () => {
    const worlds = groupByOwner([point('a1', 'ana'), point('b1', 'ben'), point('a2', 'ana')])
    expect(worlds.get('ana')?.count).toBe(2)
    expect(worlds.get('ben')?.count).toBe(1)
  })

  it('arrives at the artist’s most recent fresco, not their first', () => {
    // Newest first, so the earlier entry in the list is the more recent fresco.
    const worlds = groupByOwner([point('newest', 'ana', 5, 50), point('older', 'ana', 100, 10)])
    expect(worlds.get('ana')?.arrival).toEqual({ lng: 5, lat: 50 })
  })

  it('leaves a usable placeholder before the profile read lands', () => {
    const world = groupByOwner([point('a1', 'ana')]).get('ana')
    expect(world?.name).toBe('An artist')
    expect(world?.avatar).toBeDefined()
  })

  it('has no worlds when nothing is published', () => {
    expect(groupByOwner([]).size).toBe(0)
  })
})
