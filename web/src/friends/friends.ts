/**
 * Sinopia Neighbors: friend codes, requests, and the favorite fresco shown beside a globe.
 *
 * Free of any UI, same as sinopias.ts is free of the globe screen -- the rules about who is whose
 * neighbor live here, fetching lives here, and the components just render what comes back.
 *
 * A "friendship" is not its own row -- it is a friend_requests row with status='accepted' (see
 * 0004_friends.sql). Deleting a row is how you cancel a sent request, decline a received one, or
 * end an accepted one: one state machine instead of three.
 */
import { parseAvatar, type AvatarConfig } from '../auth/avatarConfig'
import { supabase } from '../lib/supabase'

export interface Neighbor {
  id: string
  name: string
  avatar: AvatarConfig
  friendCode: string
}

export interface PendingRequest {
  id: string
  createdAt: string
  other: Neighbor
}

export interface FriendsData {
  neighbors: Neighbor[]
  /** Sent to you, waiting on your answer. */
  incoming: PendingRequest[]
  /** Sent by you, waiting on theirs. */
  outgoing: PendingRequest[]
}

interface ProfileRow {
  id: string
  display_name: string
  avatar: unknown
  friend_code: string
}

function toNeighbor(row: ProfileRow): Neighbor {
  return { id: row.id, name: row.display_name, avatar: parseAvatar(row.avatar), friendCode: row.friend_code }
}

export async function getMyFriendCode(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('friend_code')
    .eq('id', userId)
    .maybeSingle()
  return data?.friend_code ?? null
}

export async function findProfileByCode(rawCode: string): Promise<{ id: string; name: string } | null> {
  const code = rawCode.trim().toUpperCase()
  if (code === '') return null
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('friend_code', code)
    .maybeSingle()
  return data === null || data === undefined ? null : { id: data.id, name: data.display_name }
}

export type SendRequestResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'self' | 'exists' | 'error'; message: string }

export async function sendFriendRequestByCode(myId: string, rawCode: string): Promise<SendRequestResult> {
  const target = await findProfileByCode(rawCode)
  if (target === null) {
    return { ok: false, reason: 'not-found', message: 'No artist found with that code.' }
  }
  if (target.id === myId) {
    return { ok: false, reason: 'self', message: "That's your own code." }
  }
  const { error } = await supabase
    .from('friend_requests')
    .insert({ requester_id: myId, addressee_id: target.id })
  if (error === null) return { ok: true }
  // 23505: unique_violation -- the pair_key already has a row, pending or accepted either way.
  if (error.code === '23505') {
    return {
      ok: false,
      reason: 'exists',
      message: `You and ${target.name} already have a connection -- check your Friends tab.`,
    }
  }
  return { ok: false, reason: 'error', message: "Couldn't send that request. Try again." }
}

export async function acceptFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId)
  return error === null
}

/** Cancel (by the requester), decline (by the addressee) or unfriend (either side): all a delete. */
export async function removeFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId)
  return error === null
}

export async function loadFriendsData(myId: string): Promise<FriendsData> {
  const { data: rows } = await supabase
    .from('friend_requests')
    .select('id, requester_id, addressee_id, status, created_at')
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
  const all = rows ?? []

  const otherIds = [...new Set(all.map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id)))]
  const { data: profiles } =
    otherIds.length === 0
      ? { data: [] as ProfileRow[] }
      : await supabase
          .from('profiles')
          .select('id, display_name, avatar, friend_code')
          .in('id', otherIds)
  const byId = new Map((profiles ?? []).map((p) => [p.id, toNeighbor(p)]))

  const data: FriendsData = { neighbors: [], incoming: [], outgoing: [] }
  for (const r of all) {
    const otherId = r.requester_id === myId ? r.addressee_id : r.requester_id
    const other = byId.get(otherId)
    if (other === undefined) continue
    const entry: PendingRequest = { id: r.id, createdAt: r.created_at, other }
    if (r.status === 'accepted') data.neighbors.push(other)
    else if (r.requester_id === myId) data.outgoing.push(entry)
    else data.incoming.push(entry)
  }
  return data
}

/** Just the accepted neighbor ids -- what the Sinopia system view filters its orbit down to. */
export async function loadFriendIds(myId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('friend_requests')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
  const ids = new Set<string>()
  for (const r of data ?? []) ids.add(r.requester_id === myId ? r.addressee_id : r.requester_id)
  return ids
}

export async function getFavoriteFrescoId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('favorite_fresco_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.favorite_fresco_id ?? null
}

export async function setFavoriteFresco(
  userId: string,
  frescoId: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ favorite_fresco_id: frescoId })
    .eq('id', userId)
  return { ok: error === null, error: error?.message ?? null }
}

export interface FavoriteInfo {
  frescoId: string
  title: string
  thumbUrl: string
}

/**
 * The favorite fresco for each of these accounts, keyed by owner id. Used to draw the small
 * artwork bubble above a globe in the system view. A favorite is only ever a published fresco
 * (enforced in the database, see 0004_friends.sql), so its thumbnail is always the public one --
 * no signed URL, no visibility check needed here.
 */
export async function loadFavorites(ownerIds: readonly string[]): Promise<Map<string, FavoriteInfo>> {
  const result = new Map<string, FavoriteInfo>()
  if (ownerIds.length === 0) return result

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, favorite_fresco_id')
    .in('id', ownerIds)
  const favoriteIds = (profiles ?? [])
    .map((p) => p.favorite_fresco_id)
    .filter((id): id is string => id !== null)
  if (favoriteIds.length === 0) return result

  const { data: frescoes } = await supabase
    .from('frescoes')
    .select('id, title, thumb_path')
    .in('id', favoriteIds)
  const byFrescoId = new Map((frescoes ?? []).map((f) => [f.id, f]))

  for (const p of profiles ?? []) {
    if (p.favorite_fresco_id === null) continue
    const fresco = byFrescoId.get(p.favorite_fresco_id)
    if (fresco === undefined) continue
    const thumbUrl = supabase.storage.from('globe').getPublicUrl(fresco.thumb_path).data.publicUrl
    result.set(p.id, { frescoId: fresco.id, title: fresco.title, thumbUrl })
  }
  return result
}
