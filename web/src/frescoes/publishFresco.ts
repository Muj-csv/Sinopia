/**
 * PHASE-3 task 4 (FR-008). Publish: copy the 4 sketchbook files to
 * globe/<uid>/<fid>/, then set visibility='public' + pin_precision (the
 * database trigger derives public_location from these). Unpublish: set
 * visibility='private', then delete the globe copies.
 *
 * Storage has no cross-bucket copy, so publish downloads from sketchbook
 * and re-uploads to globe.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { frescoPath, type FrescoFile, type PinPrecision } from './fresco'

const FILES: FrescoFile[] = ['photo', 'drawing', 'composite', 'thumb']

export interface LifecycleResult {
  ok: boolean
  error?: string
}

async function copySketchbookFileToGlobe(client: SupabaseClient, path: string): Promise<void> {
  const { data, error: downloadError } = await client.storage.from('sketchbook').download(path)
  if (downloadError) throw downloadError
  const { error: uploadError } = await client.storage
    .from('globe')
    .upload(path, data, { cacheControl: '31536000', contentType: 'image/webp', upsert: true })
  if (uploadError) throw uploadError
}

export async function publishFresco(
  ownerId: string,
  frescoId: string,
  precision: PinPrecision,
  client: SupabaseClient = supabase,
): Promise<LifecycleResult> {
  try {
    const paths = FILES.map((f) => frescoPath(ownerId, frescoId, f))
    await Promise.all(paths.map((p) => copySketchbookFileToGlobe(client, p)))

    const { error } = await client
      .from('frescoes')
      .update({ visibility: 'public', pin_precision: precision })
      .eq('id', frescoId)
    if (error) throw error

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Publishing failed' }
  }
}

export async function unpublishFresco(
  ownerId: string,
  frescoId: string,
  client: SupabaseClient = supabase,
): Promise<LifecycleResult> {
  try {
    const { error } = await client
      .from('frescoes')
      .update({ visibility: 'private' })
      .eq('id', frescoId)
    if (error) throw error

    const paths = FILES.map((f) => frescoPath(ownerId, frescoId, f))
    const { error: removeError } = await client.storage.from('globe').remove(paths)
    if (removeError) throw removeError

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unpublishing failed' }
  }
}
