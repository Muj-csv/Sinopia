import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { frescoImageUrl } from './frescoImageUrl'

function makeClient(opts: { signedUrl?: string; signedError?: unknown } = {}) {
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://public/x.webp' } })
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: opts.signedError ? null : { signedUrl: opts.signedUrl ?? 'https://signed/x.webp' },
    error: opts.signedError ?? null,
  })
  const storageFrom = vi.fn().mockReturnValue({ getPublicUrl, createSignedUrl })
  const client = { storage: { from: storageFrom } } as unknown as SupabaseClient
  return { client, storageFrom, getPublicUrl, createSignedUrl }
}

describe('frescoImageUrl', () => {
  it('uses the public globe URL for a public fresco', async () => {
    const { client, storageFrom, getPublicUrl } = makeClient()
    const url = await frescoImageUrl('public', 'u1/f1/thumb.webp', client)
    expect(storageFrom).toHaveBeenCalledWith('globe')
    expect(getPublicUrl).toHaveBeenCalledWith('u1/f1/thumb.webp')
    expect(url).toBe('https://public/x.webp')
  })

  it('uses a signed sketchbook URL for a private fresco', async () => {
    const { client, storageFrom, createSignedUrl } = makeClient()
    const url = await frescoImageUrl('private', 'u1/f1/thumb.webp', client)
    expect(storageFrom).toHaveBeenCalledWith('sketchbook')
    expect(createSignedUrl).toHaveBeenCalledWith('u1/f1/thumb.webp', 600)
    expect(url).toBe('https://signed/x.webp')
  })

  it('returns null instead of throwing when signing fails', async () => {
    const { client } = makeClient({ signedError: new Error('denied') })
    const url = await frescoImageUrl('private', 'u1/f1/thumb.webp', client)
    expect(url).toBeNull()
  })
})
