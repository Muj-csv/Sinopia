/**
 * Fetches the artists behind the worlds. The rule about which fresco belongs to which globe lives
 * in `sinopias.ts`, free of any database; this module only puts names and faces on the result.
 *
 * It needs no new table or RPC: globe_points already returns owner_id with every point, so the
 * worlds come from what the map has loaded, and one public read of profiles fills in the rest.
 */
import { parseAvatar } from '../auth/avatarConfig'
import { supabase } from '../lib/supabase'
import type { GlobePoint } from './geoJson'
import { groupByOwner, type Sinopia } from './sinopias'

export type { Sinopia } from './sinopias'
export { groupByOwner } from './sinopias'

/**
 * One read for all owners, not one per world.
 *
 * Falls back to names alone if the avatar column is not there yet (0003 unapplied -- merging a
 * migration does not run it), because a directory you cannot use is a worse outcome than plain
 * faces. A read that fails entirely leaves the placeholders, and the worlds stay visitable.
 */
export async function loadSinopias(points: readonly GlobePoint[]): Promise<Sinopia[]> {
  const worlds = groupByOwner(points)
  if (worlds.size === 0) return []

  const ids = [...worlds.keys()]
  const withAvatar = await supabase
    .from('profiles')
    .select('id, display_name, avatar')
    .in('id', ids)
  const rows =
    withAvatar.error === null
      ? withAvatar.data
      : ((await supabase.from('profiles').select('id, display_name').in('id', ids)).data ?? [])

  for (const row of rows ?? []) {
    const world = worlds.get(row.id)
    if (world === undefined) continue
    world.name = row.display_name
    if ('avatar' in row) world.avatar = parseAvatar(row.avatar)
  }

  return [...worlds.values()]
}
