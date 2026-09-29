import { describe, expect, it } from 'vitest'
import { centreOf, groupByOwner } from './sinopias'
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

describe('centreOf', () => {
  it('faces the middle of what an artist has drawn', () => {
    expect(centreOf([point('a', 'ana', 100, 10), point('b', 'ana', 120, 20)])).toEqual([110, 15])
  })

  it('gives an empty world somewhere to face', () => {
    // A brand-new account has no frescoes, and a globe still has to point somewhere.
    expect(centreOf([])).toEqual([15, 20])
  })

  it('is pulled by a distant fresco rather than dragged halfway to it', () => {
    // Three close together and one far away: the view should stay near the cluster.
    const [lng] = centreOf([
      point('a', 'ana', 120, 14),
      point('b', 'ana', 121, 14),
      point('c', 'ana', 122, 14),
      point('far', 'ana', 0, 14),
    ])
    expect(lng).toBeGreaterThan(80)
  })
})
