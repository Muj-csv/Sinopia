/**
 * FR-005: queries /api/references. Session cache in memory (task 5) --
 * the CDN cache on the function itself handles repeats across users, this
 * just avoids re-fetching the same query within one drawing session.
 */
export interface Reference {
  id: string
  thumbnail: string
  url: string
  title: string
  creator: string
  license: string
  license_version: string | null
  license_url: string | null
  foreign_landing_url: string
  provider: string
}

export type ReferenceSearchResult =
  { status: 'ok'; results: Reference[] } | { status: 'rate-limited' } | { status: 'error' }

const sessionCache = new Map<string, ReferenceSearchResult>()

function cacheKey(query: string, page: number): string {
  return `${query}::${page}`
}

export async function searchReferences(
  query: string,
  page = 1,
  fetchImpl: typeof fetch = fetch,
): Promise<ReferenceSearchResult> {
  const key = cacheKey(query, page)
  const cached = sessionCache.get(key)
  if (cached !== undefined) return cached

  let result: ReferenceSearchResult
  try {
    const res = await fetchImpl(`/api/references?q=${encodeURIComponent(query)}&page=${page}`)
    if (res.status === 429) {
      result = { status: 'rate-limited' }
    } else if (!res.ok) {
      result = { status: 'error' }
    } else {
      const data = (await res.json()) as { results: Reference[] }
      result = { status: 'ok', results: data.results }
    }
  } catch {
    result = { status: 'error' }
  }

  // Don't cache transient failures -- only successful/rate-limited responses,
  // so a retry after a network blip or a rate-limit window can succeed.
  if (result.status === 'ok') sessionCache.set(key, result)
  return result
}

/** Test-only: clears the module-level session cache between test cases. */
export function resetReferencesCache(): void {
  sessionCache.clear()
}
