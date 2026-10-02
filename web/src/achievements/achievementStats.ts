/** Reads the handful of counts and flags achievements.ts's server-derived entries need, in one
 *  pass over the artist's own frescoes plus a friend count and a favorite check. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AchievementStats } from './achievements'

export async function fetchAchievementStats(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<AchievementStats> {
  const [frescoesResult, friendsResult, profileResult] = await Promise.all([
    client.from('frescoes').select('visibility, pin_precision, tags').eq('owner_id', userId),
    client
      .from('friend_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    client.from('profiles').select('favorite_fresco_id').eq('id', userId).maybeSingle(),
  ])

  const rows = (frescoesResult.data ?? []) as {
    visibility: string
    pin_precision: string
    tags: string[]
  }[]

  return {
    frescoCount: rows.length,
    publishedCount: rows.filter((r) => r.visibility === 'public').length,
    friendCount: friendsResult.count ?? 0,
    hasFavorite: profileResult.data?.favorite_fresco_id != null,
    hasExactPin: rows.some((r) => r.visibility === 'public' && r.pin_precision === 'exact'),
    hasTag: rows.some((r) => r.tags.length > 0),
  }
}
