/**
 * Draw This Wall: reading the response relationship (0007_draw_this_wall.sql).
 *
 * Every read here goes through RLS, so a source that has since been unpublished, deleted or hidden
 * by a report simply comes back as null -- callers degrade the credit line instead of erroring.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadGlobePoints } from '../globe/loadGlobePoints'
import { supabase } from '../lib/supabase'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'

/** What a response carries from its source through capture, drawing and Finish. Public data only:
 *  the point is the source's public pin, never its owner's exact GPS. */
export interface DrawSource {
  id: string
  title: string
  artist: string
  thumbUrl: string | null
  imageUrl: string | null
  placeName: string | null
  /** The source's public point; null when it was saved without a location. */
  point: { lat: number; lng: number } | null
}

const ARTIST = 'profiles!frescoes_owner_id_fkey(display_name)'

interface SourceRow {
  id: string
  title: string
  place_name: string | null
  visibility: string
  moderation: string
  thumb_path: string
  composite_path: string
  profiles: { display_name: string } | null
}

/** Only a public, unreported fresco can be drawn after -- the same rule the database enforces. */
export async function loadDrawSource(
  id: string,
  client: SupabaseClient = supabase,
): Promise<DrawSource | null> {
  const { data, error } = await client
    .from('frescoes')
    .select(`id, title, place_name, visibility, moderation, thumb_path, composite_path, ${ARTIST}`)
    .eq('id', id)
    .maybeSingle()
  if (error || data === null) return null
  const row = data as unknown as SourceRow
  if (row.visibility !== 'public' || row.moderation !== 'ok') return null

  // ponytail: reuses the globe's full point list (<= 5,000 rows, same call the viewer already
  // makes) to find one public point; add a single-fresco RPC if that list ever gets heavy.
  const [{ points }, thumbUrl, imageUrl] = await Promise.all([
    loadGlobePoints(client),
    frescoImageUrl('public', row.thumb_path, client),
    frescoImageUrl('public', row.composite_path, client),
  ])
  const point = points.find((p) => p.id === id)

  return {
    id: row.id,
    title: row.title,
    artist: row.profiles?.display_name ?? 'An artist',
    thumbUrl,
    imageUrl,
    placeName: row.place_name,
    point: point === undefined ? null : { lat: point.lat, lng: point.lng },
  }
}

export interface ResponseSource {
  id: string
  title: string
  artist: string
}

/** The credit line on a response. Null when the viewer can no longer see the source. */
export async function loadResponseSource(
  sourceId: string,
  client: SupabaseClient = supabase,
): Promise<ResponseSource | null> {
  const { data, error } = await client
    .from('frescoes')
    .select(`id, title, ${ARTIST}`)
    .eq('id', sourceId)
    .maybeSingle()
  if (error || data === null) return null
  const row = data as unknown as Pick<SourceRow, 'id' | 'title' | 'profiles'>
  return { id: row.id, title: row.title, artist: row.profiles?.display_name ?? 'An artist' }
}

/** Shape the viewer's strips render (same as `same_wall`'s rows, minus the distance). */
export interface StripRow {
  id: string
  title: string
  thumb_path: string
}

/** Public responses to a fresco, newest first. Filtered to public explicitly: RLS alone would also
 *  return the viewer's own private responses, whose files aren't in the public bucket. */
export async function loadResponses(
  frescoId: string,
  client: SupabaseClient = supabase,
): Promise<StripRow[] | null> {
  const { data, error } = await client
    .from('frescoes')
    .select('id, title, thumb_path')
    .eq('source_fresco_id', frescoId)
    .eq('visibility', 'public')
    .eq('moderation', 'ok')
    .order('published_at', { ascending: false })
    .limit(24)
  if (error) return null
  return data as StripRow[]
}

/** "Response to Ian's “Old City Hall”" -- the credit wording chosen for Draw This Wall. */
export function responseCredit(source: Pick<ResponseSource, 'artist' | 'title'>): string {
  return `Response to ${source.artist}'s “${source.title}”`
}
