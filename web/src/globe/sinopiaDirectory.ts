/**
 * Loads the worlds. The rule about what a world is lives in `sinopias.ts`, free of any database;
 * this module only fetches.
 *
 * A globe belongs to an **account**, so the system is built from `profiles` -- every account has
 * a Sinopia from the day it exists, whether or not anything has been published to it. The
 * published points only decide what is drawn on each one.
 */
import { parseAvatar } from '../auth/avatarConfig'
import { supabase } from '../lib/supabase'
import type { GlobePoint } from './geoJson'
import { buildSinopias, type ProfileRow, type Sinopia } from './sinopias'

export type { Sinopia } from './sinopias'
export { groupByOwner, buildSinopias } from './sinopias'

/**
 * Far more than the system will ever draw at once (six, on a desktop), but enough that the count
 * of worlds further out is honest without reading an unbounded table.
 */
const MAX_WORLDS = 200

export async function loadSinopias(points: readonly GlobePoint[]): Promise<Sinopia[]> {
  // profiles is public (`select using (true)`), so this needs no session.
  const withAvatar = await supabase
    .from('profiles')
    .select('id, display_name, avatar')
    .limit(MAX_WORLDS)

  // Falls back to names alone if 0003 has not been applied -- merging a migration does not run
  // it, so a deploy can be ahead of its database, and a system of faceless worlds still works.
  const rows: ProfileRow[] =
    withAvatar.error === null
      ? (withAvatar.data ?? [])
      : ((await supabase.from('profiles').select('id, display_name').limit(MAX_WORLDS)).data ?? [])

  return buildSinopias(rows, points, parseAvatar)
}
