/**
 * What a Sinopia is, and how the published points divide into them.
 *
 * Every account has its own globe. A fresco belongs to exactly one of them -- its artist's -- and
 * no view ever mixes two accounts' work onto one sphere.
 *
 * Deliberately free of the Supabase client: this is the rule about who owns what, and keeping it
 * separate from the fetching means it can be tested without a database, a network or a browser.
 */
import { DEFAULT_AVATAR, type AvatarConfig } from '../auth/avatarConfig'
import type { GlobePoint } from './geoJson'

export interface Sinopia {
  ownerId: string
  name: string
  avatar: AvatarConfig
  /** How many frescoes are on this globe. Shown as "12 frescoes", never ranked against anyone. */
  count: number
  /** Where to put the camera when you arrive: their most recently published fresco. */
  arrival: { lng: number; lat: number }
}

/**
 * Groups points by artist. globe_points returns published-descending, so the first point seen for
 * an artist is their most recent, and that becomes where you arrive in their world.
 *
 * The name and face are placeholders until the profile read fills them in -- a Sinopia whose
 * artist has not loaded yet is still a Sinopia you can visit.
 */
export function groupByOwner(points: readonly GlobePoint[]): Map<string, Sinopia> {
  const worlds = new Map<string, Sinopia>()
  for (const point of points) {
    const existing = worlds.get(point.owner_id)
    if (existing === undefined) {
      worlds.set(point.owner_id, {
        ownerId: point.owner_id,
        name: 'An artist',
        avatar: DEFAULT_AVATAR,
        count: 1,
        arrival: { lng: point.lng, lat: point.lat },
      })
    } else {
      existing.count += 1
    }
  }
  return worlds
}
