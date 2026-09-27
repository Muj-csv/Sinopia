/**
 * Gesture families (ARCHITECTURE.md §6, FR-005). From the top
 * TOP_K_FAMILIES ranked matches, groups each into the first family it
 * qualifies for -- same_gesture, then same_upper_body, then
 * same_lower_body -- everything else stays "related". Thresholds read
 * from shared/rules.json, never hard-coded (CLAUDE.md).
 */
import rules from '../../../shared/rules.json'
import { TOP_K_FAMILIES, type RankedMatch, type Region } from './match'

export type Family = 'same_gesture' | 'same_upper_body' | 'same_lower_body' | 'related'

const LEG_REGIONS: Region[] = ['left_leg', 'right_leg']
const ARM_REGIONS: Region[] = ['left_arm', 'right_arm']

const SAME_GESTURE = rules.family_thresholds.same_gesture
const SAME_UPPER = rules.family_thresholds.same_upper_body
const SAME_LOWER = rules.family_thresholds.same_lower_body

type RegionScores = Partial<Record<Region, number>>

/** ARCHITECTURE.md §6: "every available region >= 80". */
function isSameGesture(regions: RegionScores): boolean {
  const scores = Object.values(regions)
  if (scores.length === 0) return false
  return scores.every((score) => score >= SAME_GESTURE.min_region_score)
}

function isSameUpperBody(regions: RegionScores): boolean {
  const required = SAME_UPPER.regions as Region[]
  const meetsRequired = required.every(
    (region) => (regions[region] ?? -Infinity) >= SAME_UPPER.min_region_score,
  )
  if (!meetsRequired) return false
  return LEG_REGIONS.some(
    (region) => regions[region] !== undefined && regions[region]! < SAME_UPPER.excluded_leg_max_score,
  )
}

function isSameLowerBody(regions: RegionScores): boolean {
  const required = SAME_LOWER.regions as Region[]
  const meetsRequired = required.every(
    (region) => (regions[region] ?? -Infinity) >= SAME_LOWER.min_region_score,
  )
  if (!meetsRequired) return false
  return ARM_REGIONS.some(
    (region) => regions[region] !== undefined && regions[region]! < SAME_LOWER.excluded_arm_max_score,
  )
}

/** A candidate lands in the first family it qualifies for, in this order (ARCHITECTURE.md §6). */
export function classifyFamily(regions: RegionScores): Family {
  if (isSameGesture(regions)) return 'same_gesture'
  if (isSameUpperBody(regions)) return 'same_upper_body'
  if (isSameLowerBody(regions)) return 'same_lower_body'
  return 'related'
}

export interface FamilyGroups<T> {
  same_gesture: RankedMatch<T>[]
  same_upper_body: RankedMatch<T>[]
  same_lower_body: RankedMatch<T>[]
  related: RankedMatch<T>[]
}

/**
 * Groups the top TOP_K_FAMILIES ranked matches by family, preserving each
 * group's ranked order. Anything beyond TOP_K_FAMILIES is dropped, per
 * ARCHITECTURE.md §6 ("From the top 60...").
 */
export function groupByFamily<T>(rankedMatches: readonly RankedMatch<T>[]): FamilyGroups<T> {
  const groups: FamilyGroups<T> = {
    same_gesture: [],
    same_upper_body: [],
    same_lower_body: [],
    related: [],
  }
  for (const match of rankedMatches.slice(0, TOP_K_FAMILIES)) {
    groups[classifyFamily(match.regions)].push(match)
  }
  return groups
}
