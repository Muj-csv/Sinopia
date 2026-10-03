/**
 * Place History (PRD §9, "Place Timeline"): reads for `0008_place_history.sql` plus the small pure
 * helpers the page and its entry points share.
 *
 * A place is a public point plus PLACE_RADIUS_M. The point always comes from something already
 * public -- a fresco's public pin, a globe pin, or a search result -- so nothing here can reach an
 * exact location.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** How far a place reaches (Jace, 2026-10-02: a street corner or a landmark and its square). Same
 *  Wall stays 50 m; the database clamps any radius to 10 m..1 km. */
export const PLACE_RADIUS_M = 250

/** One page of the timeline. */
export const PAGE_SIZE = 24

export interface Place {
  lat: number
  lng: number
  name: string | null
}

export interface PlaceFresco {
  id: string
  title: string
  thumb_path: string
  composite_path: string
  owner_id: string
  artist: string
  seen_at: string
  seen_year: number
  source_fresco_id: string | null
  source_title: string | null
  source_artist: string | null
}

export interface PlaceSummary {
  fresco_count: number
  artist_count: number
  earliest: string | null
  latest: string | null
  place_name: string | null
  years: number[]
}

export interface Cursor {
  seen: string
  id: string
}

function query(place: Place): string {
  // Five decimals is ~1 m: stable, shareable URLs without pretending to more precision.
  const params = new URLSearchParams({ lat: place.lat.toFixed(5), lng: place.lng.toFixed(5) })
  if (place.name) params.set('name', place.name)
  return params.toString()
}

/** The Place History page for a point. */
export function placeHref(place: Place): string {
  return `/place?${query(place)}`
}

/** "Add yours": a new underdrawing whose pin starts at this place (CaptureSheet reads it back). */
export function newAtPlaceHref(place: Place): string {
  return `/new?${query(place)}`
}

/** Reads a place from `?lat=&lng=&name=`. Null when the coordinates are missing or not on Earth. */
export function parsePlace(params: URLSearchParams): Place | null {
  const latText = params.get('lat')
  const lngText = params.get('lng')
  if (latText === null || lngText === null || latText === '' || lngText === '') return null
  const lat = Number(latText)
  const lng = Number(lngText)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const name = params.get('name')?.trim() || null
  return { lat, lng, name }
}

/** Splits newest-first rows into year sections, keeping their order. */
export function groupByYear<T extends Pick<PlaceFresco, 'seen_year'>>(
  rows: readonly T[],
): { year: number; rows: T[] }[] {
  const groups: { year: number; rows: T[] }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last !== undefined && last.year === row.seen_year) last.rows.push(row)
    else groups.push({ year: row.seen_year, rows: [row] })
  }
  return groups
}

/** Where the next page starts, or null when this page was the last. */
export function nextCursor(page: readonly PlaceFresco[], pageSize = PAGE_SIZE): Cursor | null {
  if (page.length < pageSize) return null
  const last = page[page.length - 1]
  return { seen: last.seen_at, id: last.id }
}

/** "2019–2026", or one year when they match. */
export function yearSpan(summary: Pick<PlaceSummary, 'years'>): string | null {
  if (summary.years.length === 0) return null
  const newest = summary.years[0]
  const oldest = summary.years[summary.years.length - 1]
  return newest === oldest ? String(newest) : `${oldest}–${newest}`
}

export async function loadPlaceSummary(
  place: Place,
  client: SupabaseClient = supabase,
): Promise<PlaceSummary | null> {
  const { data, error } = await client
    .rpc('place_summary', { p_lng: place.lng, p_lat: place.lat, p_radius_m: PLACE_RADIUS_M })
    .single()
  if (error || data === null) return null
  return data as PlaceSummary
}

export async function loadPlaceTimeline(
  place: Place,
  { year, before }: { year: number | null; before: Cursor | null },
  client: SupabaseClient = supabase,
): Promise<PlaceFresco[] | null> {
  const { data, error } = await client.rpc('place_timeline', {
    p_lng: place.lng,
    p_lat: place.lat,
    p_radius_m: PLACE_RADIUS_M,
    p_year: year,
    p_before_seen: before?.seen ?? null,
    p_before_id: before?.id ?? null,
    p_limit: PAGE_SIZE,
  })
  if (error || data === null) return null
  return data as PlaceFresco[]
}
