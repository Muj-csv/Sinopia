import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetReferencesCache, searchReferences } from './referencesClient'

afterEach(() => {
  resetReferencesCache()
})

const sampleResult = {
  id: '1',
  thumbnail: 'https://x/thumb.jpg',
  url: 'https://x/img.jpg',
  title: 'Fire hydrant',
  creator: 'Someone',
  license: 'by',
  license_version: '4.0',
  license_url: null,
  foreign_landing_url: 'https://x/source',
  provider: 'flickr',
}

describe('searchReferences', () => {
  it('returns ok with results on a successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [sampleResult] }),
    })
    const result = await searchReferences('fire hydrant', 1, fetchImpl)
    expect(result).toEqual({ status: 'ok', results: [sampleResult] })
    expect(fetchImpl).toHaveBeenCalledWith('/api/references?q=fire%20hydrant&page=1')
  })

  it('returns rate-limited on a 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    const result = await searchReferences('cat', 1, fetchImpl)
    expect(result).toEqual({ status: 'rate-limited' })
  })

  it('returns error on any other non-ok status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const result = await searchReferences('cat', 1, fetchImpl)
    expect(result).toEqual({ status: 'error' })
  })

  it('returns error instead of throwing on a network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    const result = await searchReferences('cat', 1, fetchImpl)
    expect(result).toEqual({ status: 'error' })
  })

  it('caches a successful query and does not refetch it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [sampleResult] }),
    })
    await searchReferences('cat', 1, fetchImpl)
    await searchReferences('cat', 1, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not cache an error, so a retry can hit the network again', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    await searchReferences('cat', 1, fetchImpl)
    await searchReferences('cat', 1, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('treats different pages of the same query as separate cache entries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [] }),
    })
    await searchReferences('cat', 1, fetchImpl)
    await searchReferences('cat', 2, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
