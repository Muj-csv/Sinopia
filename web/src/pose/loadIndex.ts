/** Loads the prebuilt reference index (ARCHITECTURE.md §9), built offline by ingest/ingest.py. */
import type { IndexEntry } from './match'

export async function loadIndex(): Promise<IndexEntry[]> {
  const res = await fetch('/index.v1.json')
  if (!res.ok) {
    throw new Error(`Could not load the reference index (HTTP ${res.status}).`)
  }
  return (await res.json()) as IndexEntry[]
}
