import { describe, expect, it, vi } from 'vitest'
import {
  bboxAround,
  bboxForRadius,
  distanceMetres,
  findMapillaryImage,
  findPanoramaxImage,
  findStreetLevelImage,
  MAX_RADIUS_M,
} from './streetLevel'

/** Builds a Mapillary image the search will accept, offset north of the spot by `metres`. */
function mapillaryAt(id: string, lat: number, lng: number, metres: number) {
  return { id, computed_geometry: { coordinates: [lng, lat + metres / 111_320] } }
}

function ok(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) }
}

describe('bboxAround', () => {
  it('builds a minLng,minLat,maxLng,maxLat box at the default +-0.0006deg', () => {
    const [minLng, minLat, maxLng, maxLat] = bboxAround(14.6, 121.05).split(',').map(Number)
    expect(minLng).toBeCloseTo(121.0494, 6)
    expect(minLat).toBeCloseTo(14.5994, 6)
    expect(maxLng).toBeCloseTo(121.0506, 6)
    expect(maxLat).toBeCloseTo(14.6006, 6)
  })
})

describe('bboxForRadius', () => {
  it('reaches the requested radius north and south', () => {
    const [, minLat, , maxLat] = bboxForRadius(14.6, 121.05, 150).split(',').map(Number)
    expect(distanceMetres(14.6, 121.05, maxLat, 121.05)).toBeCloseTo(150, 0)
    expect(distanceMetres(14.6, 121.05, minLat, 121.05)).toBeCloseTo(150, 0)
  })

  it('widens the longitude span away from the equator, where meridians converge', () => {
    const near = bboxForRadius(0, 0, 150).split(',').map(Number)
    const far = bboxForRadius(60, 0, 150).split(',').map(Number)
    // Same metres east-west costs about twice the degrees at 60 degrees latitude.
    expect(far[2] / near[2]).toBeCloseTo(2, 1)
  })
})

describe('distanceMetres', () => {
  it('measures a degree of latitude as about 111 km', () => {
    expect(distanceMetres(14, 121, 15, 121)).toBeCloseTo(111_320, -2)
  })

  it('is zero for the same point', () => {
    expect(distanceMetres(14.6, 121.05, 14.6, 121.05)).toBe(0)
  })
})

describe('findMapillaryImage', () => {
  it('picks the nearest image, not the first the API happens to return', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      ok({
        data: [
          mapillaryAt('far', 14.6, 121.05, 120),
          mapillaryAt('near', 14.6, 121.05, 12),
          mapillaryAt('middle', 14.6, 121.05, 60),
        ],
      }),
    )
    const result = await findMapillaryImage(14.6, 121.05, 'token', fetchImpl)
    expect(result.status).toBe('found')
    expect(result.status === 'found' && result.image.id).toBe('near')
    expect(result.status === 'found' && Math.round(result.image.distanceM)).toBe(12)
  })

  it('asks for the coordinates it needs to rank by distance', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ data: [] }))
    await findMapillaryImage(14.6, 121.05, 'token', fetchImpl)
    expect(fetchImpl.mock.calls[0][0]).toContain('access_token=token')
    expect(fetchImpl.mock.calls[0][0]).toContain('fields=id,computed_geometry,geometry')
  })

  it('falls back to raw geometry when computed_geometry is missing', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(ok({ data: [{ id: 'raw', geometry: { coordinates: [121.05, 14.6] } }] }))
    const result = await findMapillaryImage(14.6, 121.05, 'token', fetchImpl)
    expect(result.status === 'found' && result.image.id).toBe('raw')
  })

  it('ignores images beyond the maximum radius, which the bbox corners still contain', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(ok({ data: [mapillaryAt('far', 14.6, 121.05, MAX_RADIUS_M + 40)] }))
    expect((await findMapillaryImage(14.6, 121.05, 'token', fetchImpl)).status).toBe('none')
  })

  it('reports "none" when the street is genuinely empty', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ data: [] }))
    expect((await findMapillaryImage(0, 0, 'token', fetchImpl)).status).toBe('none')
  })

  it('reports "error", not "none", when no token is configured', async () => {
    const fetchImpl = vi.fn()
    expect((await findMapillaryImage(0, 0, '', fetchImpl)).status).toBe('error')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports "error" instead of throwing when the request fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'))
    expect((await findMapillaryImage(0, 0, 'token', fetchImpl)).status).toBe('error')
  })
})

describe('findPanoramaxImage', () => {
  const feature = (id: string, lat: number, lng: number, assets: Record<string, unknown>) => ({
    id,
    geometry: { coordinates: [lng, lat] },
    assets,
  })

  it('returns the nearest feature, preferring the hd asset', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      ok({
        features: [
          feature('p1', 14.6, 121.05, { hd: { href: 'https://x/hd.jpg' }, sd: { href: 'no' } }),
        ],
      }),
    )
    const result = await findPanoramaxImage(14.6, 121.05, fetchImpl, ['https://one/api'])
    expect(result).toEqual({
      status: 'found',
      image: { provider: 'panoramax', id: 'p1', imageUrl: 'https://x/hd.jpg', distanceM: 0 },
    })
  })

  it('falls back to the sd asset when hd is missing', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        ok({ features: [feature('p1', 14.6, 121.05, { sd: { href: 'https://x/sd.jpg' } })] }),
      )
    const result = await findPanoramaxImage(14.6, 121.05, fetchImpl, ['https://one/api'])
    expect(result.status === 'found' && result.image.imageUrl).toBe('https://x/sd.jpg')
  })

  it('searches every instance and keeps the closest across them', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation((url: string) =>
        url.startsWith('https://one/')
          ? Promise.resolve(
              ok({ features: [feature('far', 14.601, 121.05, { hd: { href: 'f' } })] }),
            )
          : Promise.resolve(
              ok({ features: [feature('near', 14.6, 121.05, { hd: { href: 'n' } })] }),
            ),
      )
    const result = await findPanoramaxImage(14.6, 121.05, fetchImpl, [
      'https://one/api',
      'https://two/api',
    ])
    expect(result.status === 'found' && result.image.id).toBe('near')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('still answers "none" when one instance is unreachable but another replies', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation((url: string) =>
        url.startsWith('https://dead/')
          ? Promise.reject(new Error('down'))
          : Promise.resolve(ok({ features: [] })),
      )
    const result = await findPanoramaxImage(14.6, 121.05, fetchImpl, [
      'https://dead/api',
      'https://live/api',
    ])
    expect(result.status).toBe('none')
  })

  it('reports "error" only when every instance fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'))
    const result = await findPanoramaxImage(0, 0, fetchImpl, ['https://a/api', 'https://b/api'])
    expect(result.status).toBe('error')
  })
})

describe('findStreetLevelImage', () => {
  it('prefers Mapillary when it has a result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(ok({ data: [mapillaryAt('m1', 14.6, 121.05, 5)] })),
    )
    const result = await findStreetLevelImage(14.6, 121.05, 'token')
    expect(result.status === 'found' && result.image.provider).toBe('mapillary')
    vi.unstubAllGlobals()
  })

  it('falls back to Panoramax when Mapillary has nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        url.includes('mapillary')
          ? Promise.resolve(ok({ data: [] }))
          : Promise.resolve(
              ok({
                features: [
                  {
                    id: 'p1',
                    geometry: { coordinates: [121.05, 14.6] },
                    assets: { hd: { href: 'u' } },
                  },
                ],
              }),
            ),
      ),
    )
    const result = await findStreetLevelImage(14.6, 121.05, 'token')
    expect(result).toEqual({
      status: 'found',
      image: { provider: 'panoramax', id: 'p1', imageUrl: 'u', distanceM: 0 },
    })
    vi.unstubAllGlobals()
  })

  it('reports "none" when neither provider covers the spot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ data: [], features: [] })))
    expect((await findStreetLevelImage(0, 0, 'token')).status).toBe('none')
    vi.unstubAllGlobals()
  })

  it('reports "error" when no provider could be asked at all', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    expect((await findStreetLevelImage(0, 0, 'token')).status).toBe('error')
    vi.unstubAllGlobals()
  })

  it('still reports "none" when Mapillary is misconfigured but Panoramax answers empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ features: [] })))
    // No token: Mapillary is an error, but Panoramax replied, so the street is simply empty.
    expect((await findStreetLevelImage(0, 0, '')).status).toBe('none')
    vi.unstubAllGlobals()
  })
})
