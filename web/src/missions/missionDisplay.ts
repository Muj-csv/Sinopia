/**
 * Pure display/eligibility helpers, kept apart from missions.ts's Supabase calls so they're
 * testable without a database (same split as sliderMath.ts / fresco.ts elsewhere in this app).
 * These never gate anything by themselves -- submit_mission_fresco() is the real enforcement
 * (SEC-06: don't trust client-supplied eligibility) -- they only drive what the UI shows.
 */
import type { Mission } from './missions'

/** SM-FR-02's "scope" line on a mission card. */
export function formatScope(mission: Pick<Mission, 'missionType' | 'radiusMeters'>): string {
  switch (mission.missionType) {
    case 'global':
      return 'Global'
    case 'regional':
      return 'Regional'
    case 'radius':
      return mission.radiusMeters !== null
        ? `Within ${formatDistance(mission.radiusMeters)}`
        : 'Nearby'
    case 'place':
      return 'This place'
    case 'fresco':
      return 'Answer this fresco'
  }
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`
    : `${meters} m`
}

/** SM-FR-02's "active period" line, e.g. "Ends in 18h" / "Starts in 2d" / "Ended". Null = no limit. */
export function formatTimeRemaining(
  mission: Pick<Mission, 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): string | null {
  if (mission.startsAt !== null && now < new Date(mission.startsAt)) {
    return `Starts in ${formatDuration(new Date(mission.startsAt).getTime() - now.getTime())}`
  }
  if (mission.endsAt === null) return null
  const remaining = new Date(mission.endsAt).getTime() - now.getTime()
  return remaining <= 0 ? 'Ended' : `Ends in ${formatDuration(remaining)}`
}

function formatDuration(ms: number): string {
  const hours = Math.round(ms / (1000 * 60 * 60))
  if (hours < 1) return 'less than an hour'
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

/**
 * Whether the Start button should be enabled right now -- a UX nicety (SM-FR-04/05), not the
 * security boundary. A disabled button here just saves a round trip to a server rejection; the
 * database still enforces this independently of whatever this function returns.
 */
export function isMissionOpenNow(
  mission: Pick<Mission, 'status' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): boolean {
  if (mission.status !== 'active') return false
  if (mission.startsAt !== null && now < new Date(mission.startsAt)) return false
  if (mission.endsAt !== null && now > new Date(mission.endsAt)) return false
  return true
}
