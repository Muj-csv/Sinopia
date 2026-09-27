/**
 * Nominatim reverse geocoding (FR-002, $0 stack per ADR-004). Usage policy
 * caps this at <=1 request/second -- a single shared queue enforces that
 * across the whole app regardless of how many callers there are.
 */
const MIN_INTERVAL_MS = 1000
let lastCallAt = 0
let queue: Promise<unknown> = Promise.resolve()

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now())
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCallAt = Date.now()
    return fn()
  })
  queue = run.catch(() => undefined)
  return run
}

export interface ReverseGeocodeResult {
  placeName: string | null
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ReverseGeocodeResult> {
  return throttled(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      const res = await fetchImpl(url, {
        headers: { 'Accept-Language': navigator.language },
      })
      if (!res.ok) return { placeName: null }
      const data = (await res.json()) as { display_name?: string }
      return { placeName: data.display_name ?? null }
    } catch {
      return { placeName: null }
    }
  })
}
