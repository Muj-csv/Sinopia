/**
 * Sketch Missions (Sinopia_Feature_Expansion_PRD.md, feature 3): location-aware creative prompts.
 * Mission rows are readable directly (RLS already filters drafts out); every write goes through
 * `submit_mission_fresco`, the one security-definer function that validates ownership, the active
 * window, the geographic radius and the per-user submission limit server-side (0006_missions_and_
 * collaborative_frescos.sql) -- none of that is re-checked here, the database is the source of truth.
 */
import { supabase } from '../lib/supabase'

export type MissionType = 'global' | 'regional' | 'radius' | 'place' | 'fresco'
export type MissionStatus = 'draft' | 'active' | 'closed' | 'archived'

export interface Mission {
  id: string
  title: string
  prompt: string
  description: string | null
  missionType: MissionType
  status: MissionStatus
  startsAt: string | null
  endsAt: string | null
  lng: number | null
  lat: number | null
  radiusMeters: number | null
  placeName: string | null
  targetFrescoId: string | null
  maxSubmissionsPerUser: number | null
  createdAt: string
}

interface MissionRow {
  id: string
  title: string
  prompt: string
  description: string | null
  mission_type: MissionType
  status: string
  starts_at: string | null
  ends_at: string | null
  public_location: string | null // geojson text via the select below
  radius_meters: number | null
  place_name: string | null
  target_fresco_id: string | null
  max_submissions_per_user: number | null
  created_at: string
}

/** PostgREST returns a PostGIS geography column as a GeoJSON string when asked to cast it. */
function toMission(row: MissionRow): Mission {
  let lng: number | null = null
  let lat: number | null = null
  if (row.public_location !== null) {
    try {
      const geo = JSON.parse(row.public_location) as { coordinates?: [number, number] }
      if (geo.coordinates !== undefined) [lng, lat] = geo.coordinates
    } catch {
      // Unexpected shape -- treat the mission as having no plotted centre rather than throwing.
    }
  }
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    description: row.description,
    missionType: row.mission_type,
    status: row.status as MissionStatus,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    lng,
    lat,
    radiusMeters: row.radius_meters,
    placeName: row.place_name,
    targetFrescoId: row.target_fresco_id,
    maxSubmissionsPerUser: row.max_submissions_per_user,
    createdAt: row.created_at,
  }
}

const MISSION_COLUMNS =
  'id, title, prompt, description, mission_type, status, starts_at, ends_at, ' +
  'public_location, radius_meters, place_name, target_fresco_id, max_submissions_per_user, created_at'

export async function fetchActiveMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_COLUMNS)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error !== null) {
    console.error('fetchActiveMissions failed:', error)
    throw error
  }
  // supabase-js can only infer a select string's shape at the type level when it's a literal
  // template; MISSION_COLUMNS is built with `+`, so this cast replaces that lost inference (same
  // pattern FrescoViewer.tsx already uses for its own embedded-resource select).
  return ((data ?? []) as unknown as MissionRow[]).map(toMission)
}

export async function fetchArchivedMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_COLUMNS)
    .eq('status', 'archived')
    .order('created_at', { ascending: false })
  if (error !== null) {
    console.error('fetchArchivedMissions failed:', error)
    throw error
  }
  return ((data ?? []) as unknown as MissionRow[]).map(toMission)
}

export async function fetchMission(id: string): Promise<Mission | null> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error !== null) {
    console.error('fetchMission failed:', error)
    throw error
  }
  return data === null ? null : toMission(data as unknown as MissionRow)
}

export interface MissionStats {
  participantCount: number
  frescoCount: number
}

export async function fetchMissionStats(missionId: string): Promise<MissionStats> {
  const { data, error } = await supabase.rpc('mission_stats', { p_mission_id: missionId })
  if (error !== null || data === null || data.length === 0) {
    return { participantCount: 0, frescoCount: 0 }
  }
  return {
    participantCount: Number(data[0].participant_count),
    frescoCount: Number(data[0].fresco_count),
  }
}

export interface MissionSubmissionRow {
  frescoId: string
  userId: string
  submittedAt: string
  title: string
  thumbPath: string
}

/** The public gallery (SM-FR-10): RLS already hides submissions whose fresco isn't public/approved. */
export async function fetchMissionSubmissions(missionId: string): Promise<MissionSubmissionRow[]> {
  const { data, error } = await supabase
    .from('mission_submissions')
    .select('fresco_id, user_id, submitted_at, frescoes!inner(title, thumb_path)')
    .eq('mission_id', missionId)
    .order('submitted_at', { ascending: false })
  if (error !== null) {
    console.error('fetchMissionSubmissions failed:', error)
    throw error
  }
  return (data ?? []).map((r) => {
    const fresco = Array.isArray(r.frescoes) ? r.frescoes[0] : r.frescoes
    return {
      frescoId: r.fresco_id,
      userId: r.user_id,
      submittedAt: r.submitted_at,
      title: fresco?.title ?? '',
      thumbPath: fresco?.thumb_path ?? '',
    }
  })
}

export type SubmitMissionResult = { ok: true } | { ok: false; error: string }

export async function submitMissionFresco(
  missionId: string,
  frescoId: string,
): Promise<SubmitMissionResult> {
  const { error } = await supabase.rpc('submit_mission_fresco', {
    p_mission_id: missionId,
    p_fresco_id: frescoId,
  })
  if (error !== null) return { ok: false, error: error.message }
  return { ok: true }
}

/** Has this artist already submitted to this mission? Used to grey out a repeat Start button. */
export async function hasSubmittedToMission(missionId: string, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('mission_submissions')
    .select('fresco_id', { count: 'exact', head: true })
    .eq('mission_id', missionId)
    .eq('user_id', userId)
  return (count ?? 0) > 0
}
