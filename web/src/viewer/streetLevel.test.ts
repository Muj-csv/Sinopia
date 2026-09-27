import { describe, expect, it, vi } from 'vitest'
import {
  bboxAround,
  findMapillaryImage,
  findPanoramaxImage,
  findStreetLevelImage,
} from './streetLevel'

describe('bboxAround', () => {
  it('builds a minLng,minLat,maxLng,maxLat box at the default +-0.0006deg', () => {
    const [minLng, minLat, maxLng, maxLat] = bboxAround(14.6, 121.05).split(',').map(Number)
    expect(minLng).toBeCloseTo(121.0494, 6)
    expect(minLat).toBeCloseTo(14.5994, 6)
    expect(maxLng).toBeCloseTo(121.0506, 6)
    expect(maxLat).toBeCloseTo(14.6006, 6)
  })
})

describe('findMapillaryImage', () => {
  it('returns the first image id from a successful search', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'm1' }, { id: 'm2' }] }),
    })
    const result = await findMapillaryImage(14.6, 121.05, 'token', fetchImpl)
    expect(result).toEqual({ provider: 'mapillary', id: 'm1' })
    expect(fetchImpl.mock.calls[0][0]).toContain('access_token=token')
    expect(fetchImpl.mock.calls[0][0]).toMatch(
      /bbox=121\.049[34].*,14\.599[34].*,121\.050[56].*,14\.600[56]/,
    )
  })

  it('returns null when nothing is nearby', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) })
    expect(await findMapillaryImage(0, 0, 'token', fetchImpl)).toBeNull()
  })

  it('returns null without calling fetch when no token is configured', async () => {
    const fetchImpl = vi.fn()
    expect(await findMapillaryImage(0, 0, '', fetchImpl)).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns null instead of throwing on failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'))
    expect(await findMapillaryImage(0, 0, 'token', fetchImpl)).toBeNull()
  })
})

describe('findPanoramaxImage', () => {
  it('returns the first feature, preferring the hd asset', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          features: [
            {
              id: 'p1',
              assets: { hd: { href: 'https://x/hd.jpg' }, sd: { href: 'https://x/sd.jpg' } },
            },
          ],
        }),
    })
    const result = await findPanoramaxImage(14.6, 121.05, fetchImpl)
    expect(result).toEqual({ provider: 'panoramax', id: 'p1', imageUrl: 'https://x/hd.jpg' })
  })

  it('falls back to the sd asset when hd is missing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ features: [{ id: 'p1', assets: { sd: { href: 'https://x/sd.jpg' } } }] }),
    })
    const result = await findPanoramaxImage(14.6, 121.05, fetchImpl)
    expect(result?.imageUrl).toBe('https://x/sd.jpg')
  })

  it('returns null when there are no features', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ features: [] }) })
    expect(await findPanoramaxImage(0, 0, fetchImpl)).toBeNull()
  })

  it('returns null instead of throwing on failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'))
    expect(await findPanoramaxImage(0, 0, fetchImpl)).toBeNull()
  })
})

describe('findStreetLevelImage', () => {
  it('prefers Mapillary when it has a result', async () => {
    const mapillaryFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [{ id: 'm1' }] }) })
    vi.stubGlobal('fetch', mapillaryFetch)
    const result = await findStreetLevelImage(14.6, 121.05, 'token')
    expect(result).toEqual({ provider: 'mapillary', id: 'm1' })
    vi.unstubAllGlobals()
  })

  it('falls back to Panoramax when Mapillary has nothing', async () => {
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        call++
        if (call === 1)
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ features: [{ id: 'p1', assets: { hd: { href: 'u' } } }] }),
        })
      }),
    )
    const result = await findStreetLevelImage(14.6, 121.05, 'token')
    expect(result).toEqual({ provider: 'panoramax', id: 'p1', imageUrl: 'u' })
    vi.unstubAllGlobals()
  })

  it('returns null when neither has anything', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [], features: [] }) }),
    )
    expect(await findStreetLevelImage(0, 0, 'token')).toBeNull()
    vi.unstubAllGlobals()
  })
})
