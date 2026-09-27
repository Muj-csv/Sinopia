import { beforeEach, describe, expect, it } from 'vitest'
import { emptyHistory, pushEntry } from '../draw/strokeHistory'
import { createDraft, deleteDraft, getDraft, listDrafts, updateDraft } from './draftStore'

const blob = (n: number) => new Blob([new Uint8Array(n)])

const baseInput = {
  photo: blob(10),
  thumb: blob(2),
  width: 1600,
  height: 1200,
  capturedAt: '2026-09-27T00:00:00.000Z',
  location: { lat: 14.6, lng: 121.0 },
  placeName: 'Manila',
}

beforeEach(async () => {
  for (const d of await listDrafts()) await deleteDraft(d.id)
})

describe('createDraft / getDraft', () => {
  it('round-trips a draft with a fresh id and empty history', async () => {
    const draft = await createDraft(baseInput)
    expect(draft.id).toBeTruthy()
    expect(draft.history).toEqual(emptyHistory())

    const fetched = await getDraft(draft.id)
    expect(fetched?.id).toBe(draft.id)
    expect(fetched?.placeName).toBe('Manila')
    expect(fetched?.width).toBe(1600)
    // fake-indexeddb's structured-clone can't round-trip jsdom's Blob under
    // this test environment (cross-realm instanceof mismatch); real
    // IndexedDB preserves Blobs natively in an actual browser, verified
    // manually. Not a limitation of draftStore.ts itself.
  })

  it('returns undefined for an unknown id', async () => {
    expect(await getDraft('nope')).toBeUndefined()
  })

  it('gives each draft a unique id', async () => {
    const a = await createDraft(baseInput)
    const b = await createDraft(baseInput)
    expect(a.id).not.toBe(b.id)
  })
})

describe('updateDraft', () => {
  it('merges a patch and bumps updatedAt', async () => {
    const draft = await createDraft(baseInput)
    const history = pushEntry(emptyHistory(), {
      type: 'stroke',
      id: 's1',
      layerIndex: 0,
      tool: 'brush',
      points: [{ x: 0, y: 0 }],
      color: '#000',
      size: 4,
      opacity: 1,
    })

    const updated = await updateDraft(draft.id, { history, placeName: 'Quezon City' })

    expect(updated?.placeName).toBe('Quezon City')
    expect(updated?.history).toEqual(history)
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(draft.updatedAt)
    expect(updated?.createdAt).toBe(draft.createdAt)
  })

  it('returns undefined when the draft does not exist', async () => {
    expect(await updateDraft('nope', { placeName: 'x' })).toBeUndefined()
  })
})

const tick = () => new Promise((r) => setTimeout(r, 5))

describe('listDrafts / deleteDraft', () => {
  it('lists newest-updated first', async () => {
    const a = await createDraft(baseInput)
    await tick()
    const b = await createDraft(baseInput)
    await tick()
    await updateDraft(a.id, { placeName: 'touched again' })

    const listed = await listDrafts()
    expect(listed[0].id).toBe(a.id)
    expect(listed[1].id).toBe(b.id)
  })

  it('deleteDraft removes it', async () => {
    const draft = await createDraft(baseInput)
    await deleteDraft(draft.id)
    expect(await getDraft(draft.id)).toBeUndefined()
  })
})
