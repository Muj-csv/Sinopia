import { describe, expect, it, vi } from 'vitest'
import { reverseGeocode } from './nominatim'

describe('reverseGeocode', () => {
  it('returns the display_name from a successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ display_name: 'Rizal Park, Manila' }),
    })
    const result = await reverseGeocode(14.5832, 120.9794, fetchImpl as unknown as typeof fetch)
    expect(result.placeName).toBe('Rizal Park, Manila')
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('lat=14.5832'),
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('returns null placeName on a non-ok response, without throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false })
    await expect(reverseGeocode(0, 0, fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      placeName: null,
    })
  })

  it('returns null placeName if fetch rejects, without throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    await expect(reverseGeocode(0, 0, fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      placeName: null,
    })
  })

  it('serializes concurrent calls at least 1000ms apart', async () => {
    vi.useFakeTimers()
    const calledAt: number[] = []
    const fetchImpl = vi.fn().mockImplementation(() => {
      calledAt.push(Date.now())
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ display_name: 'x' }) })
    })

    const p1 = reverseGeocode(1, 1, fetchImpl as unknown as typeof fetch)
    const p2 = reverseGeocode(2, 2, fetchImpl as unknown as typeof fetch)
    await vi.runAllTimersAsync()
    await Promise.all([p1, p2])

    expect(calledAt).toHaveLength(2)
    expect(calledAt[1] - calledAt[0]).toBeGreaterThanOrEqual(1000)
    vi.useRealTimers()
  })
})
