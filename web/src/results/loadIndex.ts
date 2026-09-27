/** Fetches the prebuilt reference index (ARCHITECTURE.md §9), cached for the session. */
import type { Signature } from '../pose/signature'

export interface IndexEntry {
  id: string
  provider: string
  thumb: string
  landing: string
  license: string
  license_version?: string
  creator: string
  title: string
  attribution: string
  sig: Signature
}

let cache: Promise<IndexEntry[]> | null = null

export function loadIndex(): Promise<IndexEntry[]> {
  // import.meta.env.BASE_URL respects vite.config.ts's `base` (root locally, /Sinopia/ on GitHub Pages).
  cache ??= fetch(`${import.meta.env.BASE_URL}index.v1.json`).then((res) => {
    if (!res.ok) throw new Error(`index fetch failed: ${res.status}`)
    return res.json() as Promise<IndexEntry[]>
  })
  return cache
}

/** Test-only: clears the module-level cache between test cases. */
export function resetIndexCache(): void {
  cache = null
}
