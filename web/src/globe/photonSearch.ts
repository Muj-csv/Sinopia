/** PHASE-4 task 1: Photon place search for the globe's SearchPill (ARCHITECTURE.md: free, no key). */
export interface PlaceResult {
  label: string
  lng: number
  lat: number
}

interface PhotonFeature {
  properties: { name?: string; city?: string; country?: string }
  geometry: { coordinates: [number, number] }
}

function labelFor(props: PhotonFeature['properties']): string {
  return [props.name, props.city, props.country].filter(Boolean).join(', ')
}

export async function searchPlaces(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceResult[]> {
  const trimmed = query.trim()
  if (trimmed === '') return []
  try {
    const res = await fetchImpl(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as { features: PhotonFeature[] }
    return data.features
      .filter((f) => f.properties.name !== undefined)
      .map((f) => ({
        label: labelFor(f.properties),
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }))
  } catch {
    return []
  }
}
