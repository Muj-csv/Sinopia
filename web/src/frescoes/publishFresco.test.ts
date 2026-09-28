import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { publishFresco, unpublishFresco } from './publishFresco'

const REF = { ownerId: 'u1', frescoId: 'f1' }

function makeClient(
  opts: {
    downloadError?: unknown
    uploadError?: unknown
    updateError?: unknown
    removeError?: unknown
    removed?: unknown[]
  } = {},
) {
  const download = vi.fn().mockResolvedValue({
    data: new Blob(['x']),
    error: opts.downloadError ?? null,
  })
  const upload = vi.fn().mockResolvedValue({ error: opts.uploadError ?? null })
  const remove = vi.fn().mockResolvedValue({
    // Storage returns the objects it actually removed; four paths are requested each time.
    data: opts.removed ?? [{}, {}, {}, {}],
    error: opts.removeError ?? null,
  })
  const storageFrom = vi.fn().mockReturnValue({ download, upload, remove })

  const eq = vi.fn().mockResolvedValue({ error: opts.updateError ?? null })
  const update = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ update })

  const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient
  return { client, storageFrom, download, upload, remove, from, update, eq }
}

describe('publishFresco', () => {
  it('downloads all 4 sketchbook files and re-uploads them to globe', async () => {
    const { client, storageFrom, download, upload } = makeClient()
    const result = await publishFresco(REF, 'neighborhood', client)

    expect(result.ok).toBe(true)
    expect(storageFrom).toHaveBeenCalledWith('sketchbook')
    expect(storageFrom).toHaveBeenCalledWith('globe')
    expect(download).toHaveBeenCalledTimes(4)
    expect(upload).toHaveBeenCalledTimes(4)
    expect(upload.mock.calls.every((c) => c[0].startsWith('u1/f1/'))).toBe(true)
  })

  it('sets visibility public with the chosen precision', async () => {
    const { client, from, update, eq } = makeClient()
    await publishFresco(REF, 'exact', client)

    expect(from).toHaveBeenCalledWith('frescoes')
    expect(update).toHaveBeenCalledWith({ visibility: 'public', pin_precision: 'exact' })
    expect(eq).toHaveBeenCalledWith('id', 'f1')
  })

  it('fails without updating the row when a download fails', async () => {
    const { client, update } = makeClient({ downloadError: new Error('not found') })
    const result = await publishFresco(REF, 'neighborhood', client)
    expect(result.ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('fails when the visibility update fails', async () => {
    const { client } = makeClient({ updateError: new Error('rls denied') })
    const result = await publishFresco(REF, 'neighborhood', client)
    expect(result.ok).toBe(false)
  })
})

describe('unpublishFresco', () => {
  it('sets visibility private, then removes the globe files', async () => {
    const { client, update, storageFrom, remove } = makeClient()
    const result = await unpublishFresco(REF, client)

    expect(result.ok).toBe(true)
    expect(update).toHaveBeenCalledWith({ visibility: 'private' })
    expect(storageFrom).toHaveBeenCalledWith('globe')
    expect(remove).toHaveBeenCalledWith([
      'u1/f1/photo.webp',
      'u1/f1/drawing.webp',
      'u1/f1/composite.webp',
      'u1/f1/thumb.webp',
    ])
  })

  it('fails without removing files when the update fails', async () => {
    const { client, remove } = makeClient({ updateError: new Error('rls denied') })
    const result = await unpublishFresco(REF, client)
    expect(result.ok).toBe(false)
    expect(remove).not.toHaveBeenCalled()
  })
})

describe('unpublishFresco when storage removes nothing', () => {
  // RLS can make a row invisible rather than refuse the delete, so storage reports success having
  // removed nothing. Left unchecked, the app would call the fresco private while its images stayed
  // readable at their public URL.
  it('fails loudly when no images were removed', async () => {
    const { client } = makeClient({ removed: [] })
    const result = await unpublishFresco(REF, client)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('still public')
  })

  it('fails when only some images were removed', async () => {
    const { client } = makeClient({ removed: [{}, {}] })
    const result = await unpublishFresco(REF, client)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('2 of 4')
  })

  it('succeeds when all four are removed', async () => {
    const { client } = makeClient()
    expect((await unpublishFresco(REF, client)).ok).toBe(true)
  })
})
