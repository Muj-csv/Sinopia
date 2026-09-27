import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadIndex, resetIndexCache } from './loadIndex'

afterEach(() => {
  resetIndexCache()
  vi.unstubAllGlobals()
})

describe('loadIndex', () => {
  it('fetches /index.v1.json and parses it', async () => {
    const entries = [{ id: 'a' }]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(entries) })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadIndex()

    expect(fetchMock).toHaveBeenCalledWith('/index.v1.json')
    expect(result).toEqual(entries)
  })

  it('caches the result: a second call does not fetch again', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })
    vi.stubGlobal('fetch', fetchMock)

    await loadIndex()
    await loadIndex()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(loadIndex()).rejects.toThrow('404')
  })
})
