/**
 * PHASE-3 task 3 (FR-007): upload the 4 images to sketchbook/<uid>/<fid>/,
 * insert `frescoes` (private), then `fresco_locations`. On any failure the
 * caller keeps the local draft and can retry -- nothing here deletes it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { frescoPath, pointWkt, type FinishFields, type ReferenceUsed } from './fresco'

export interface SaveFrescoInput extends FinishFields {
  ownerId: string
  photo: Blob
  drawing: Blob
  composite: Blob
  thumb: Blob
  width: number
  height: number
  capturedAt: string | null
  location: { lat: number; lng: number } | null
  referencesUsed: ReferenceUsed[]
  /** Draw This Wall: the public fresco this one responds to. */
  sourceFrescoId?: string | null
}

export interface SaveFrescoResult {
  ok: boolean
  frescoId: string
  error?: string
  /** Postgres/PostgREST error code, when there is one ('42501' = a row-level security refusal). */
  code?: string
}

async function uploadOne(
  client: SupabaseClient,
  bucket: string,
  path: string,
  blob: Blob,
): Promise<void> {
  const { error } = await client.storage
    .from(bucket)
    .upload(path, blob, { cacheControl: '31536000', contentType: 'image/webp', upsert: true })
  if (error) throw error
}

/**
 * True when Postgres is telling us a column doesn't exist, which means its migration hasn't been
 * applied to this project yet (same situation ProfilePage.tsx's isMissingAvatarColumn handles for
 * `avatar` -- merging a migration doesn't run it, CLAUDE.md, so a deploy can land ahead of its
 * database). Every artist's upload would otherwise fail outright until someone applies
 * 0005_references_used.sql, regardless of platform -- this is a server-side gap, not a device one.
 */
function isMissingColumn(
  error: { code?: string; message?: string } | null,
  column: string,
): boolean {
  if (error === null) return false
  // 42703 is Postgres "undefined column"; PGRST204 is PostgREST's schema-cache equivalent.
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (error.message?.includes(column) === true && error.message.includes('column'))
  )
}

export async function saveFresco(
  input: SaveFrescoInput,
  client: SupabaseClient = supabase,
): Promise<SaveFrescoResult> {
  const frescoId = crypto.randomUUID()
  const paths = {
    photo: frescoPath(input.ownerId, frescoId, 'photo'),
    drawing: frescoPath(input.ownerId, frescoId, 'drawing'),
    composite: frescoPath(input.ownerId, frescoId, 'composite'),
    thumb: frescoPath(input.ownerId, frescoId, 'thumb'),
  }

  try {
    await Promise.all([
      uploadOne(client, 'sketchbook', paths.photo, input.photo),
      uploadOne(client, 'sketchbook', paths.drawing, input.drawing),
      uploadOne(client, 'sketchbook', paths.composite, input.composite),
      uploadOne(client, 'sketchbook', paths.thumb, input.thumb),
    ])

    const frescoRow = {
      id: frescoId,
      owner_id: input.ownerId,
      title: input.title.trim(),
      caption: input.caption || null,
      memory: input.memory || null,
      tags: input.tags,
      visibility: 'private',
      pin_precision: 'neighborhood',
      place_name: input.placeName || null,
      captured_at: input.capturedAt,
      width: input.width,
      height: input.height,
      photo_path: paths.photo,
      drawing_path: paths.drawing,
      composite_path: paths.composite,
      thumb_path: paths.thumb,
      references_used: input.referencesUsed,
      // Only sent when set, so an ordinary save never depends on 0007_draw_this_wall.sql.
      ...(input.sourceFrescoId ? { source_fresco_id: input.sourceFrescoId } : {}),
    }
    let { error: insertError } = await client.from('frescoes').insert(frescoRow)

    // The images are already uploaded at this point -- retrying without the one column a project
    // might be behind on is what keeps an unapplied migration from blocking every upload outright.
    if (isMissingColumn(insertError, 'references_used')) {
      console.warn(
        'frescoes.references_used is missing (0005_references_used.sql not applied yet) -- ' +
          'saving without reference attribution.',
      )
      const withoutReferencesUsed: Partial<typeof frescoRow> = { ...frescoRow }
      delete withoutReferencesUsed.references_used
      ;({ error: insertError } = await client.from('frescoes').insert(withoutReferencesUsed))
    }
    if (insertError) throw insertError

    if (input.location !== null) {
      const { error: locationError } = await client.from('fresco_locations').insert({
        fresco_id: frescoId,
        owner_id: input.ownerId,
        location: pointWkt(input.location.lat, input.location.lng),
      })
      if (locationError) throw locationError
    }

    return { ok: true, frescoId }
  } catch (err) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : undefined
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String(err.message)
          : 'Save failed'
    return { ok: false, frescoId, error: message, code }
  }
}
