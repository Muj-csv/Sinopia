/** PHASE-4 task 1: rpc('globe_points') -- RLS + moderation already applied server-side (docs/schema.sql). */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { GlobePoint } from './geoJson'

export async function loadGlobePoints(
  client: SupabaseClient = supabase,
): Promise<{ points: GlobePoint[]; error: boolean }> {
  const { data, error } = await client.rpc('globe_points')
  if (error || data === null) return { points: [], error: true }
  return { points: data as GlobePoint[], error: false }
}
