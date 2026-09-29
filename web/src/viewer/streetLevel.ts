/**
 * PHASE-5a task 1 (FR-015): nearest street-level image to a fresco's spot -- Mapillary first,
 * Panoramax as the fallback, nothing if neither covers the place. Never called for
 * `neighborhood` precision (that decision lives in the caller, StreetLevelPanel.tsx).
 *
 * Both providers are searched with a bounding box and return their matches unordered, so the
 * "nearest" in ARCHITECTURE.md section 3 has to be computed here from each candidate's own
 * coordinates. We ask for one generous box (MAX_RADIUS_M) rather than widening in steps: one
 * round trip, and picking the closest of the results is the same answer a ladder would reach.
 */

/** Metres per degree of latitude. Good to ~0.1% over the range that matters here. */
const METRES_PER_DEGREE = 111_320

/** The distance the feature promises: imagery this close is "the spot" without qualification. */
export const NEAR_RADIUS_M = 60

/**
 * The furthest we will show. Beyond this it stops being the wall the artist drew, so a match
 * further out than this is treated as no coverage at all.
 */
export const MAX_RADIUS_M = 150

/** A dead host must not sit inside the panel's spinner; api.panoramax.xyz can hang for 20s+. */
const REQUEST_TIMEOUT_MS = 6_000

/**
 * Panoramax is federated, and the instance covering a place is not always the central one. These
 * are queried together rather than in turn so one unreachable host costs no extra wall time.
 */
const PANORAMAX_INSTANCES = ['https://panoramax.ign.fr/api', 'https://api.panoramax.xyz/api']

const BBOX_DELTA = 0.0006

/** Legacy degree-delta box, kept for callers that think in degrees. */
export function bboxAround(lat: number, lng: number, delta = BBOX_DELTA): string {
  return `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
}

/**
 * A box that reaches `radiusM` in every direction. Longitude needs a wider span of degrees than
 * latitude because meridians converge away from the equator.
 */
export function bboxForRadius(lat: number, lng: number, radiusM: number): string {
  const latDelta = radiusM / METRES_PER_DEGREE
  const shrink = Math.max(Math.cos((lat * Math.PI) / 180), 0.01)
  const lngDelta = radiusM / (METRES_PER_DEGREE * shrink)
  return `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`
}

/**
 * Equirectangular approximation. Exact enough well under a kilometre, and far cheaper than
 * haversine for the handful of candidates we rank.
 */
export function distanceMetres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const meanLat = ((aLat + bLat) / 2) * (Math.PI / 180)
  const dLat = (bLat - aLat) * METRES_PER_DEGREE
  const dLng = (bLng - aLng) * METRES_PER_DEGREE * Math.cos(meanLat)
  return Math.hypot(dLat, dLng)
}

export interface MapillaryImage {
  provider: 'mapillary'
  id: string
  /** Metres from the fresco's spot, so the panel can say so when it is not right there. */
  distanceM: number
}

export interface PanoramaxImage {
  provider: 'panoramax'
  id: string
  imageUrl: string
  distanceM: number
}

export type StreetLevelImage = MapillaryImage | PanoramaxImage

/**
 * "Nothing here" and "we could not ask" are different things to tell a reader, and the old
 * catch-all `null` made them indistinguishable -- which is how an unreachable host came to read
 * as an empty street.
 */
export type Outcome<T extends StreetLevelImage = StreetLevelImage> =
  { status: 'found'; image: T } | { status: 'none' } | { status: 'error' }

/** Each finder narrows this to its own provider, so a caller keeps that provider's fields. */
export type StreetLevelOutcome = Outcome

/**
 * Why a panel is empty is a developer's question, not a reader's: the reader gets the plain copy
 * in StreetLevelPanel, and this says which provider fell over. Stripped from production builds.
 */
function warnInDev(message: string): void {
  if (import.meta.env.DEV) console.warn(`[street-level] ${message}`)
}

/** Resolves to null on any transport-level failure; the caller decides what that means. */
async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** GeoJSON is [lng, lat]; that order the wrong way round silently relocates every candidate. */
function pointOf(geometry: unknown): { lat: number; lng: number } | null {
  const coords = (geometry as { coordinates?: unknown } | undefined)?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const [lng, lat] = coords
  if (typeof lng !== 'number' || typeof lat !== 'number') return null
  return { lat, lng }
}

interface MapillaryFeature {
  id: string
  computed_geometry?: unknown
  geometry?: unknown
}

export async function findMapillaryImage(
  lat: number,
  lng: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Outcome<MapillaryImage>> {
  // No token is a configuration gap, not an empty street: say "unavailable", not "nothing here".
  if (token === '') {
    warnInDev('VITE_MAPILLARY_TOKEN is not set, so only Panoramax was searched.')
    return { status: 'error' }
  }

  const url =
    `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
    `&fields=id,computed_geometry,geometry&bbox=${bboxForRadius(lat, lng, MAX_RADIUS_M)}&limit=50`
  const data = await fetchJson<{ data?: MapillaryFeature[] }>(url, fetchImpl)
  if (data === null) {
    warnInDev('Mapillary rejected the search or could not be reached. Check the token.')
    return { status: 'error' }
  }

  let best: MapillaryImage | null = null
  for (const feature of data.data ?? []) {
    // computed_geometry is Mapillary's refined position and is missing on some images; the raw
    // geometry is the camera's own GPS and is always present.
    const at = pointOf(feature.computed_geometry) ?? pointOf(feature.geometry)
    if (at === null || typeof feature.id !== 'string') continue
    const distanceM = distanceMetres(lat, lng, at.lat, at.lng)
    if (distanceM > MAX_RADIUS_M) continue
    if (best === null || distanceM < best.distanceM) {
      best = { provider: 'mapillary', id: feature.id, distanceM }
    }
  }
  return best === null ? { status: 'none' } : { status: 'found', image: best }
}

interface PanoramaxFeature {
  id: string
  geometry?: unknown
  assets?: Record<string, { href?: string }>
}

export async function findPanoramaxImage(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch,
  instances: readonly string[] = PANORAMAX_INSTANCES,
): Promise<Outcome<PanoramaxImage>> {
  const bbox = bboxForRadius(lat, lng, MAX_RADIUS_M)
  const responses = await Promise.all(
    instances.map((base) =>
      fetchJson<{ features?: PanoramaxFeature[] }>(
        `${base}/search?bbox=${bbox}&limit=50`,
        fetchImpl,
      ),
    ),
  )

  // Every instance failing is an error; one answering with nothing is a genuinely empty street.
  if (responses.every((r) => r === null)) {
    warnInDev(`No Panoramax instance could be reached (tried ${instances.join(', ')}).`)
    return { status: 'error' }
  }

  let best: PanoramaxImage | null = null
  for (const response of responses) {
    for (const feature of response?.features ?? []) {
      const at = pointOf(feature.geometry)
      const imageUrl = feature.assets?.hd?.href ?? feature.assets?.sd?.href
      if (at === null || imageUrl === undefined || typeof feature.id !== 'string') continue
      const distanceM = distanceMetres(lat, lng, at.lat, at.lng)
      if (distanceM > MAX_RADIUS_M) continue
      if (best === null || distanceM < best.distanceM) {
        best = { provider: 'panoramax', id: feature.id, imageUrl, distanceM }
      }
    }
  }
  return best === null ? { status: 'none' } : { status: 'found', image: best }
}

/**
 * Mapillary first, Panoramax fallback. One provider failing is not the final answer while the
 * other might still have the street, so the fallback runs either way and only a pair of failures
 * reports `error`.
 */
export async function findStreetLevelImage(
  lat: number,
  lng: number,
  mapillaryToken: string,
): Promise<StreetLevelOutcome> {
  const mapillary = await findMapillaryImage(lat, lng, mapillaryToken)
  if (mapillary.status === 'found') return mapillary

  const panoramax = await findPanoramaxImage(lat, lng)
  if (panoramax.status === 'found') return panoramax

  if (mapillary.status === 'error' && panoramax.status === 'error') return { status: 'error' }
  return { status: 'none' }
}
