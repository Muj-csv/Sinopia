/** PHASE-3 task 4: remove both buckets' files, then the row (fresco_locations cascades via FK). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { frescoPath, type FrescoFile } from './fresco'
import type { LifecycleResult } from './publishFresco'

const FILES: FrescoFile[] = ['photo', 'drawing', 'composite', 'thumb']

export async function deleteFresco(
  ownerId: string,
  frescoId: string,
  wasPublished: boolean,
  client: SupabaseClient = supabase,
): Promise<LifecycleResult> {
  try {
    const paths = FILES.map((f) => frescoPath(ownerId, frescoId, f))

    const { error: sketchbookError } = await client.storage.from('sketchbook').remove(paths)
    if (sketchbookError) throw sketchbookError

    if (wasPublished) {
      const { error: globeError } = await client.storage.from('globe').remove(paths)
      if (globeError) throw globeError
    }

    const { error: deleteError } = await client.from('frescoes').delete().eq('id', frescoId)
    if (deleteError) throw deleteError

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' }
  }
}
