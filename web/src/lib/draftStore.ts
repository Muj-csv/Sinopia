/**
 * Draft ("underdrawing") storage (PRD §10: "Drafts stored in the browser
 * (IndexedDB) until finished; never uploaded"). Shape chosen to map
 * cleanly onto `frescoes`/`fresco_locations` (docs/schema.sql) once a
 * draft is finished and actually saved -- that save step is a later
 * phase, not built here.
 *
 * The store is still named 'sinopia-drafts' even though the word for a draft
 * is now "underdrawing" (Update 1.2, which freed "Sinopia" to mean the
 * artist's world). The name is a database key, not copy: renaming it points
 * idb-keyval at a fresh, empty store and every unfinished drawing already on
 * someone's device becomes unreachable. It stays as it is.
 */
import { createStore, del, get, keys, set } from 'idb-keyval'
import type { LocationSource } from '../capture/LocationFallback'
import { emptyHistory, type History } from '../draw/strokeHistory'
import type { Reference } from '../references/referencesClient'

export interface Draft {
  id: string
  createdAt: number
  updatedAt: number
  photo: Blob
  thumb: Blob
  width: number
  height: number
  capturedAt: string | null
  location: { lat: number; lng: number } | null
  /** Where `location` came from, so Pin check can say so rather than confirming silently
   *  (SCREENS.md "Pin check"). Optional: drafts written before this existed won't have it. */
  locationSource?: LocationSource
  placeName: string | null
  history: History
  /** Set once DrawScreen's Finish button has rasterized the canvas (PHASE-3 task 2-3). */
  exported?: { drawing: Blob; composite: Blob }
  /** References pinned while drawing this underdrawing, so they survive a reload the same way
   *  the stroke history does. Optional: drafts written before pinning existed won't have it. */
  pinnedReferences?: Reference[]
}

const store = createStore('sinopia-drafts', 'drafts')

export function newDraftId(): string {
  return crypto.randomUUID()
}

export async function createDraft(input: {
  photo: Blob
  thumb: Blob
  width: number
  height: number
  capturedAt: string | null
  location: { lat: number; lng: number } | null
  locationSource?: LocationSource
  placeName: string | null
}): Promise<Draft> {
  const now = Date.now()
  const draft: Draft = {
    id: newDraftId(),
    createdAt: now,
    updatedAt: now,
    history: emptyHistory(),
    ...input,
  }
  await set(draft.id, draft, store)
  return draft
}

export async function getDraft(id: string): Promise<Draft | undefined> {
  return get<Draft>(id, store)
}

export async function updateDraft(
  id: string,
  patch: Partial<Omit<Draft, 'id' | 'createdAt'>>,
): Promise<Draft | undefined> {
  const existing = await getDraft(id)
  if (existing === undefined) return undefined
  const updated: Draft = { ...existing, ...patch, updatedAt: Date.now() }
  await set(id, updated, store)
  return updated
}

export async function listDrafts(): Promise<Draft[]> {
  const ids = await keys(store)
  const drafts = await Promise.all(ids.map((id) => get<Draft>(id, store)))
  return drafts.filter((d): d is Draft => d !== undefined).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteDraft(id: string): Promise<void> {
  await del(id, store)
}
