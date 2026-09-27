/** PHASE-4 task 4 (FR-013): reason <= 300 chars, matching docs/schema.sql's check constraint. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const MAX_REASON_LENGTH = 300

export function validateReason(reason: string): string | null {
  if (reason.length > MAX_REASON_LENGTH) return `Reason must be ${MAX_REASON_LENGTH} characters or fewer.`
  return null
}

export async function reportFresco(
  frescoId: string,
  reporterId: string,
  reason: string,
  client: SupabaseClient = supabase,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client
    .from('reports')
    .insert({ fresco_id: frescoId, reporter_id: reporterId, reason: reason || null })
  if (error) return { ok: false, error: "Couldn't send the report" }
  return { ok: true }
}
