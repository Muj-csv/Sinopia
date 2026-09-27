/**
 * PHASE-3 task 3 (FR-007): upload the 4 images to sketchbook/<uid>/<fid>/,
 * insert `frescoes` (private), then `fresco_locations`. On any failure the
 * caller keeps the local draft and can retry -- nothing here deletes it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { frescoPath, pointWkt, type FinishFields } from './fresco'

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
}

export interface SaveFrescoResult {
  ok: boolean
  frescoId: string
  error?: string
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

    const { error: insertError } = await client.from('frescoes').insert({
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
    })
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
    return { ok: false, frescoId, error: err instanceof Error ? err.message : 'Save failed' }
  }
}
