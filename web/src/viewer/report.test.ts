import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_REASON_LENGTH, reportFresco, validateReason } from './report'

describe('validateReason', () => {
  it('accepts an empty reason', () => {
    expect(validateReason('')).toBeNull()
  })
  it('accepts a reason at the limit', () => {
    expect(validateReason('a'.repeat(MAX_REASON_LENGTH))).toBeNull()
  })
  it('rejects a reason over the limit', () => {
    expect(validateReason('a'.repeat(MAX_REASON_LENGTH + 1))).toMatch(/300/)
  })
})

describe('reportFresco', () => {
  function makeClient(error: unknown = null) {
    const insert = vi.fn().mockResolvedValue({ error })
    const from = vi.fn().mockReturnValue({ insert })
    return { client: { from } as unknown as SupabaseClient, from, insert }
  }

  it('inserts fresco_id, reporter_id and reason', async () => {
    const { client, from, insert } = makeClient()
    const result = await reportFresco('f1', 'u2', 'spam', client)
    expect(result.ok).toBe(true)
    expect(from).toHaveBeenCalledWith('reports')
    expect(insert).toHaveBeenCalledWith({ fresco_id: 'f1', reporter_id: 'u2', reason: 'spam' })
  })

  it('sends null for an empty reason', async () => {
    const { client, insert } = makeClient()
    await reportFresco('f1', 'u2', '', client)
    expect(insert).toHaveBeenCalledWith({ fresco_id: 'f1', reporter_id: 'u2', reason: null })
  })

  it('returns a friendly error instead of throwing', async () => {
    const { client } = makeClient(new Error('unique violation'))
    const result = await reportFresco('f1', 'u2', 'spam', client)
    expect(result.ok).toBe(false)
    expect(result.error).toBeDefined()
  })
})
