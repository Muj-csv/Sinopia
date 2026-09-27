import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteFresco } from './deleteFresco'

function makeClient(
  opts: {
    sketchbookRemoveError?: unknown
    globeRemoveError?: unknown
    deleteError?: unknown
  } = {},
) {
  const removeSketchbook = vi.fn().mockResolvedValue({ error: opts.sketchbookRemoveError ?? null })
  const removeGlobe = vi.fn().mockResolvedValue({ error: opts.globeRemoveError ?? null })
  const storageFrom = vi.fn().mockImplementation((bucket: string) => ({
    remove: bucket === 'sketchbook' ? removeSketchbook : removeGlobe,
  }))

  const eq = vi.fn().mockResolvedValue({ error: opts.deleteError ?? null })
  const del = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ delete: del })

  const client = { storage: { from: storageFrom }, from } as unknown as SupabaseClient
  return { client, storageFrom, removeSketchbook, removeGlobe, from, del, eq }
}

describe('deleteFresco', () => {
  it('removes sketchbook files and the row when never published', async () => {
    const { client, removeSketchbook, removeGlobe, from, del, eq } = makeClient()
    const result = await deleteFresco('u1', 'f1', false, client)
    expect(result.ok).toBe(true)

    expect(removeSketchbook).toHaveBeenCalledWith([
      'u1/f1/photo.webp',
      'u1/f1/drawing.webp',
      'u1/f1/composite.webp',
      'u1/f1/thumb.webp',
    ])
    expect(removeGlobe).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalledWith('frescoes')
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', 'f1')
  })

  it('also removes globe files when the fresco was published', async () => {
    const { client, removeGlobe } = makeClient()
    const result = await deleteFresco('u1', 'f1', true, client)
    expect(result.ok).toBe(true)
    expect(removeGlobe).toHaveBeenCalled()
  })

  it('fails without deleting the row when sketchbook removal fails', async () => {
    const { client, del } = makeClient({ sketchbookRemoveError: new Error('boom') })
    const result = await deleteFresco('u1', 'f1', false, client)
    expect(result.ok).toBe(false)
    expect(del).not.toHaveBeenCalled()
  })

  it('fails when globe removal fails for a published fresco', async () => {
    const { client, del } = makeClient({ globeRemoveError: new Error('boom') })
    const result = await deleteFresco('u1', 'f1', true, client)
    expect(result.ok).toBe(false)
    expect(del).not.toHaveBeenCalled()
  })
})
