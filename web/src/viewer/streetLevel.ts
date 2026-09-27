/**
 * PHASE-5a task 1 (FR-015): nearest Mapillary image within ~60m, else
 * Panoramax, else nothing. Never called for `neighborhood` precision
 * (that decision lives in the caller, StreetLevelPanel.tsx).
 * ARCHITECTURE.md §4: bbox +-0.0006deg (~60-70m).
 */
const BBOX_DELTA = 0.0006

export function bboxAround(lat: number, lng: number, delta = BBOX_DELTA): string {
  return `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
}

export interface MapillaryImage {
  provider: 'mapillary'
  id: string
}

export interface PanoramaxImage {
  provider: 'panoramax'
  id: string
  imageUrl: string
}

export type StreetLevelImage = MapillaryImage | PanoramaxImage

export async function findMapillaryImage(
  lat: number,
  lng: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MapillaryImage | null> {
  if (token === '') return null
  try {
    const url =
      `https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}` +
      `&fields=id&bbox=${bboxAround(lat, lng)}&limit=5`
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const data = (await res.json()) as { data?: { id: string }[] }
    const first = data.data?.[0]
    return first ? { provider: 'mapillary', id: first.id } : null
  } catch {
    return null
  }
}

export async function findPanoramaxImage(
  lat: number,
  lng: number,
  fetchImpl: typeof fetch = fetch,
): Promise<PanoramaxImage | null> {
  try {
    const url = `https://api.panoramax.xyz/api/search?bbox=${bboxAround(lat, lng)}&limit=5`
    const res = await fetchImpl(url)
    if (!res.ok) return null
    const data = (await res.json()) as {
      features?: { id: string; assets?: Record<string, { href?: string }> }[]
    }
    const feature = data.features?.[0]
    if (feature === undefined) return null
    const imageUrl = feature.assets?.hd?.href ?? feature.assets?.sd?.href
    if (imageUrl === undefined) return null
    return { provider: 'panoramax', id: feature.id, imageUrl }
  } catch {
    return null
  }
}

/** Mapillary first, Panoramax fallback, null if neither has anything nearby. */
export async function findStreetLevelImage(
  lat: number,
  lng: number,
  mapillaryToken: string,
): Promise<StreetLevelImage | null> {
  const mapillary = await findMapillaryImage(lat, lng, mapillaryToken)
  if (mapillary !== null) return mapillary
  return findPanoramaxImage(lat, lng)
}
