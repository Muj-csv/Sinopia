/**
 * FR-002 location fallback chain: EXIF GPS -> device geolocation -> map
 * picker. The decision of which source to use is pure and testable; the
 * async calls themselves (geolocation, EXIF read) are separate so tests
 * don't need real browser APIs.
 */
import { hasGps, type ExifResult } from '../lib/exif'

export type LocationSource = 'exif' | 'device' | 'map'

export interface ResolvedLocation {
  source: LocationSource
  lat: number | null
  lng: number | null
}

/** Pure: given EXIF + an optional already-fetched device position, pick the source. */
export function resolveLocationSource(
  exif: ExifResult,
  devicePosition: { lat: number; lng: number } | null,
): ResolvedLocation {
  if (hasGps(exif)) return { source: 'exif', lat: exif.lat, lng: exif.lng }
  if (devicePosition !== null) return { source: 'device', ...devicePosition }
  return { source: 'map', lat: null, lng: null }
}

/** Wraps navigator.geolocation in a Promise; null on denial/error/timeout, never throws. */
export function getDevicePosition(
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined = navigator.geolocation,
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (geolocation === undefined) {
      resolve(null)
      return
    }
    geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    )
  })
}
