import { describe, expect, it, vi } from 'vitest'
import { searchPlaces } from './photonSearch'

const sampleResponse = {
  features: [
    {
      properties: { name: 'Rizal Park', city: 'Manila', country: 'Philippines' },
      geometry: { coordinates: [120.9794, 14.5832] },
    },
    { properties: {}, geometry: { coordinates: [0, 0] } }, // no name -- should be filtered out
  ],
}

describe('searchPlaces', () => {
  it('returns an empty array for a blank query without calling fetch', async () => {
    const fetchImpl = vi.fn()
    expect(await searchPlaces('   ', fetchImpl)).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('maps features to label + lng/lat, skipping ones with no name', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleResponse) })
    const results = await searchPlaces('rizal', fetchImpl)
    expect(results).toEqual([{ label: 'Rizal Park, Manila, Philippines', lng: 120.9794, lat: 14.5832 }])
  })

  it('returns an empty array on a non-ok response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false })
    expect(await searchPlaces('x', fetchImpl)).toEqual([])
  })

  it('returns an empty array instead of throwing on a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await searchPlaces('x', fetchImpl)).toEqual([])
  })
})
