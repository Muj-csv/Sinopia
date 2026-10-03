/**
 * Collaborative Fresco (Sinopia_Feature_Expansion_PRD.md, feature 4): one shared container, many
 * independently attributed layers. Adding a layer always goes through `add_collaborative_
 * contribution`, the security-definer function that checks ownership, the invite list and the
 * open/closed state server-side (0006_missions_and_collaborative_frescos.sql) -- this module never
 * re-implements that check, it just calls the function and reports what came back.
 */
import { supabase } from '../lib/supabase'
import type { Visibility } from '../frescoes/fresco'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'

export type CollaborativeStatus = 'open' | 'closed'

export interface CollaborativeFresco {
  id: string
  ownerId: string
  missionId: string | null
  title: string
  description: string | null
  placeName: string | null
  status: CollaborativeStatus
  visibility: Visibility
  inviteOnly: boolean
  createdAt: string
}

interface CollaborativeFrescoRow {
  id: string
  owner_id: string
  mission_id: string | null
  title: string
  description: string | null
  place_name: string | null
  status: string
  visibility: Visibility
  invite_only: boolean
  created_at: string
}

function toCollaborativeFresco(row: CollaborativeFrescoRow): CollaborativeFresco {
  return {
    id: row.id,
    ownerId: row.owner_id,
    missionId: row.mission_id,
    title: row.title,
    description: row.description,
    placeName: row.place_name,
    status: row.status as CollaborativeStatus,
    visibility: row.visibility,
    inviteOnly: row.invite_only,
    createdAt: row.created_at,
  }
}

const CF_COLUMNS =
  'id, owner_id, mission_id, title, description, place_name, status, visibility, invite_only, created_at'

export interface CreateCollaborativeFrescoInput {
  ownerId: string
  title: string
  description: string
  placeName: string
  missionId: string | null
  visibility: Visibility
  inviteOnly: boolean
}

export async function createCollaborativeFresco(
  input: CreateCollaborativeFrescoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('collaborative_frescos')
    .insert({
      owner_id: input.ownerId,
      title: input.title.trim(),
      description: input.description || null,
      place_name: input.placeName || null,
      mission_id: input.missionId,
      visibility: input.visibility,
      invite_only: input.inviteOnly,
    })
    .select('id')
    .single()
  if (error !== null || data === null) {
    return { ok: false, error: error?.message ?? 'Could not create the collaborative fresco' }
  }
  return { ok: true, id: data.id }
}

export async function fetchCollaborativeFresco(id: string): Promise<CollaborativeFresco | null> {
  const { data, error } = await supabase
    .from('collaborative_frescos')
    .select(CF_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error !== null) {
    console.error('fetchCollaborativeFresco failed:', error)
    throw error
  }
  return data === null ? null : toCollaborativeFresco(data)
}

/** Everything a user can currently see: theirs, invited to, or already contributing to. */
export async function fetchMyCollaborativeFrescos(): Promise<CollaborativeFresco[]> {
  const { data, error } = await supabase
    .from('collaborative_frescos')
    .select(CF_COLUMNS)
    .order('created_at', { ascending: false })
  if (error !== null) {
    console.error('fetchMyCollaborativeFrescos failed:', error)
    throw error
  }
  return (data ?? []).map(toCollaborativeFresco)
}

export async function closeCollaborativeFresco(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from('collaborative_frescos')
    .update({ status: 'closed' })
    .eq('id', id)
  return { ok: error === null, error: error?.message ?? null }
}

export interface Contribution {
  id: string
  frescoId: string
  contributorId: string
  contributorName: string
  label: string | null
  layerOrder: number
  createdAt: string
  thumbUrl: string
}

interface ContributionRow {
  id: string
  fresco_id: string
  contributor_id: string
  label: string | null
  layer_order: number
  created_at: string
  profiles: { display_name: string } | { display_name: string }[] | null
  frescoes:
    | { thumb_path: string; visibility: Visibility }
    | { thumb_path: string; visibility: Visibility }[]
    | null
}

/** `profiles(display_name)` and `frescoes(thumb_path)` both reuse their own RLS automatically --
 *  PostgREST's embedded-resource join only returns rows the caller is already allowed to read. */
export async function fetchContributions(collaborativeFrescoId: string): Promise<Contribution[]> {
  const { data, error } = await supabase
    .from('collaborative_fresco_contributions')
    .select(
      'id, fresco_id, contributor_id, label, layer_order, created_at, ' +
        'profiles!collaborative_fresco_contributions_contributor_id_fkey(display_name), ' +
        'frescoes!inner(thumb_path, visibility)',
    )
    .eq('collaborative_fresco_id', collaborativeFrescoId)
    .order('layer_order', { ascending: true })
  if (error !== null) {
    console.error('fetchContributions failed:', error)
    throw error
  }
  return Promise.all(
    ((data ?? []) as unknown as ContributionRow[]).map(async (r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      const fresco = Array.isArray(r.frescoes) ? r.frescoes[0] : r.frescoes
      // A private contribution needs a signed URL, same as any private fresco in the Sketchbook --
      // getPublicUrl() on a private-bucket path returns a URL that looks valid but 403s.
      const thumbUrl =
        fresco === null || fresco === undefined
          ? ''
          : ((await frescoImageUrl(fresco.visibility, fresco.thumb_path)) ?? '')
      return {
        id: r.id,
        frescoId: r.fresco_id,
        contributorId: r.contributor_id,
        contributorName: profile?.display_name ?? 'An artist',
        label: r.label,
        layerOrder: r.layer_order,
        createdAt: r.created_at,
        thumbUrl,
      }
    }),
  )
}

export type AddContributionResult = { ok: true } | { ok: false; error: string }

export async function addContribution(
  collaborativeFrescoId: string,
  frescoId: string,
  label: string | null,
): Promise<AddContributionResult> {
  const { error } = await supabase.rpc('add_collaborative_contribution', {
    p_collaborative_fresco_id: collaborativeFrescoId,
    p_fresco_id: frescoId,
    p_label: label,
  })
  if (error !== null) return { ok: false, error: error.message }
  return { ok: true }
}

export async function removeContribution(
  contributionId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from('collaborative_fresco_contributions')
    .delete()
    .eq('id', contributionId)
  return { ok: error === null, error: error?.message ?? null }
}

export async function reorderContribution(
  contributionId: string,
  layerOrder: number,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from('collaborative_fresco_contributions')
    .update({ layer_order: layerOrder })
    .eq('id', contributionId)
  return { ok: error === null, error: error?.message ?? null }
}

export interface Invitation {
  id: string
  inviteeId: string
  inviteeName: string
  createdAt: string
}

export async function fetchInvitations(collaborativeFrescoId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('collaborative_fresco_invitations')
    .select(
      'id, invitee_id, created_at, profiles!collaborative_fresco_invitations_invitee_id_fkey(display_name)',
    )
    .eq('collaborative_fresco_id', collaborativeFrescoId)
  if (error !== null) {
    console.error('fetchInvitations failed:', error)
    throw error
  }
  return (data ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    return {
      id: r.id,
      inviteeId: r.invitee_id,
      inviteeName: profile?.display_name ?? 'An artist',
      createdAt: r.created_at,
    }
  })
}

export async function inviteCollaborator(
  collaborativeFrescoId: string,
  invitedBy: string,
  inviteeId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('collaborative_fresco_invitations').insert({
    collaborative_fresco_id: collaborativeFrescoId,
    invitee_id: inviteeId,
    invited_by: invitedBy,
  })
  // 23505: unique_violation -- already invited. Not worth surfacing as a hard error.
  if (error !== null && error.code !== '23505') return { ok: false, error: error.message }
  return { ok: true, error: null }
}
