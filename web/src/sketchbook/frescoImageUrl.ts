/** Private frescoes need a signed URL (sketchbook bucket); public ones use the public globe URL directly. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Visibility } from '../frescoes/fresco'

const SIGNED_URL_TTL_SECONDS = 60 * 10

export async function frescoImageUrl(
  visibility: Visibility,
  path: string,
  client: SupabaseClient = supabase,
): Promise<string | null> {
  if (visibility === 'public') {
    return client.storage.from('globe').getPublicUrl(path).data.publicUrl
  }
  const { data, error } = await client.storage
    .from('sketchbook')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || data === null) return null
  return data.signedUrl
}
