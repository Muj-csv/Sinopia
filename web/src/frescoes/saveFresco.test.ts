import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { saveFresco, type SaveFrescoInput } from './saveFresco'

function makeClient(
  opts: {
    uploadError?: unknown
    insertError?: unknown
    locationError?: unknown
  } = {},
) {
  const upload = vi.fn().mockResolvedValue({ error: opts.uploadError ?? null })
  const storageFrom = vi.fn().mockReturnValue({ upload })

  const insert = vi.fn().mockImplementation((row: { fresco_id?: string }) => {
    // fresco_locations rows have fresco_id; frescoes rows don't.
    const isLocation = 'fresco_id' in row
    return Promise.resolve({
      error: isLocation ? (opts.locationError ?? null) : (opts.insertError ?? null),
    })
  })
  const from = vi.fn().mockReturnValue({ insert })

  const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient
  return { client, upload, storageFrom, insert, from }
}

const baseInput: SaveFrescoInput = {
  ownerId: 'u1',
  title: 'A wall',
  caption: '',
  memory: '',
  tags: [],
  placeName: 'Manila',
  photo: new Blob(['p']),
  drawing: new Blob(['d']),
  composite: new Blob(['c']),
  thumb: new Blob(['t']),
  width: 1600,
  height: 1200,
  capturedAt: null,
  location: { lat: 14.6, lng: 121.05 },
}

describe('saveFresco', () => {
  it('uploads all 4 files to the sketchbook bucket at the right paths', async () => {
    const { client, storageFrom, upload } = makeClient()
    await saveFresco(baseInput, client)

    expect(storageFrom).toHaveBeenCalledWith('sketchbook')
    const uploadedPaths = upload.mock.calls.map((c) => c[0])
    expect(uploadedPaths.every((p: string) => p.startsWith('u1/'))).toBe(true)
    expect(uploadedPaths.some((p: string) => p.endsWith('/photo.webp'))).toBe(true)
    expect(uploadedPaths.some((p: string) => p.endsWith('/drawing.webp'))).toBe(true)
    expect(uploadedPaths.some((p: string) => p.endsWith('/composite.webp'))).toBe(true)
    expect(uploadedPaths.some((p: string) => p.endsWith('/thumb.webp'))).toBe(true)
  })

  it('inserts frescoes as private with the uploaded paths', async () => {
    const { client, from, insert } = makeClient()
    const result = await saveFresco(baseInput, client)

    expect(result.ok).toBe(true)
    expect(from).toHaveBeenCalledWith('frescoes')
    const frescoRow = insert.mock.calls.find((c) => !('fresco_id' in c[0]))![0]
    expect(frescoRow.visibility).toBe('private')
    expect(frescoRow.owner_id).toBe('u1')
    expect(frescoRow.title).toBe('A wall')
    expect(frescoRow.photo_path).toBe(`u1/${result.frescoId}/photo.webp`)
  })

  it('inserts fresco_locations when a location is present', async () => {
    const { client, insert } = makeClient()
    await saveFresco(baseInput, client)

    const locationRow = insert.mock.calls.find((c) => 'fresco_id' in c[0])?.[0]
    expect(locationRow).toBeDefined()
    expect(locationRow.location).toBe('POINT(121.05 14.6)')
  })

  it('skips fresco_locations when there is no location', async () => {
    const { client, insert } = makeClient()
    await saveFresco({ ...baseInput, location: null }, client)

    const locationRow = insert.mock.calls.find((c) => 'fresco_id' in c[0])
    expect(locationRow).toBeUndefined()
  })

  it('fails without inserting when an upload fails', async () => {
    const { client, from } = makeClient({ uploadError: new Error('storage down') })
    const result = await saveFresco(baseInput, client)

    expect(result.ok).toBe(false)
    expect(from).not.toHaveBeenCalled()
  })

  it('fails when the frescoes insert fails', async () => {
    const { client } = makeClient({ insertError: new Error('constraint violated') })
    const result = await saveFresco(baseInput, client)
    expect(result.ok).toBe(false)
  })

  it('fails when the fresco_locations insert fails', async () => {
    const { client } = makeClient({ locationError: new Error('rls denied') })
    const result = await saveFresco(baseInput, client)
    expect(result.ok).toBe(false)
  })
})
