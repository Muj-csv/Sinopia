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

/**
 * Named rather than positional: `ownerId` and `frescoId` are both strings, so a positional
 * signature let a caller swap them and still compile, which silently published nothing.
 */
export interface FrescoRef {
  ownerId: string
  frescoId: string
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
  { ownerId, frescoId }: FrescoRef,
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
  { ownerId, frescoId }: FrescoRef,
  client: SupabaseClient = supabase,
): Promise<LifecycleResult> {
  try {
    const { error } = await client
      .from('frescoes')
      .update({ visibility: 'private' })
      .eq('id', frescoId)
    if (error) throw error

    const paths = FILES.map((f) => frescoPath(ownerId, frescoId, f))
    const { data: removed, error: removeError } = await client.storage.from('globe').remove(paths)
    if (removeError) throw removeError

    // Storage reports no error when a delete matches nothing, and RLS can make a row invisible
    // rather than refuse the delete. Unpublishing that quietly removed nothing would leave the
    // images readable at their public URL while the app showed the fresco as private, so this
    // is checked rather than assumed.
    if (removed === null || removed.length < paths.length) {
      throw new Error(
        `Unpublished, but ${paths.length - (removed?.length ?? 0)} of ${paths.length} images are still public. Check the globe bucket's storage policies.`,
      )
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unpublishing failed' }
  }
}
