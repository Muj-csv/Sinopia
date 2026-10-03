import { describe, expect, it } from 'vitest'
import { getDevicePosition, resolveLocationSource } from './LocationFallback'

describe('resolveLocationSource', () => {
  it('prefers EXIF GPS when present', () => {
    const result = resolveLocationSource(
      { lat: 14.6, lng: 121, capturedAt: null },
      { lat: 1, lng: 1 },
    )
    expect(result).toEqual({ source: 'exif', lat: 14.6, lng: 121 })
  })

  it('falls back to the device position when EXIF has no GPS', () => {
    const result = resolveLocationSource(
      { lat: null, lng: null, capturedAt: null },
      { lat: 2, lng: 3 },
    )
    expect(result).toEqual({ source: 'device', lat: 2, lng: 3 })
  })

  it('falls back to the map picker when neither EXIF nor device has a position', () => {
    const result = resolveLocationSource({ lat: null, lng: null, capturedAt: null }, null)
    expect(result).toEqual({ source: 'map', lat: null, lng: null })
  })

  it("a response's own photo GPS beats the source fresco's pin", () => {
    const result = resolveLocationSource({ lat: 14.6, lng: 121, capturedAt: null }, null, {
      lat: 15.145,
      lng: 120.59,
    })
    expect(result).toEqual({ source: 'exif', lat: 14.6, lng: 121 })
  })

  it("without photo GPS, a response starts at the source fresco's public pin", () => {
    const result = resolveLocationSource(
      { lat: null, lng: null, capturedAt: null },
      { lat: 2, lng: 3 },
      { lat: 15.145, lng: 120.59 },
    )
    expect(result).toEqual({ source: 'source', lat: 15.145, lng: 120.59 })
  })

  it('treats a partial EXIF GPS (only one of lat/lng) as absent', () => {
    const result = resolveLocationSource(
      { lat: 14.6, lng: null, capturedAt: null },
      { lat: 2, lng: 3 },
    )
    expect(result.source).toBe('device')
  })
})

describe('getDevicePosition', () => {
  it('resolves with lat/lng on success', async () => {
    const geolocation = {
      getCurrentPosition: (success: PositionCallback) => {
        success({ coords: { latitude: 10, longitude: 20 } } as GeolocationPosition)
      },
    }
    await expect(getDevicePosition(geolocation)).resolves.toEqual({ lat: 10, lng: 20 })
  })

  it('resolves null on denial/error instead of throwing', async () => {
    const geolocation = {
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError)
      },
    }
    await expect(getDevicePosition(geolocation)).resolves.toBeNull()
  })

  it('resolves null when geolocation is unavailable', async () => {
    await expect(getDevicePosition(undefined)).resolves.toBeNull()
  })
})
