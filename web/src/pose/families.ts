/**
 * Gesture families (ARCHITECTURE.md §6). FR-005.
 *
 * Groups the top-60 match pool into Same gesture / Same upper body /
 * Same lower body, in that priority order; everything else is "related".
 * Thresholds come from shared/rules.json, not hard-coded.
 */
import rules from '../../../shared/rules.json'
import { REGION_KEYS, type MatchResult, type RegionKey } from './match'

export const FAMILY_KEYS = ['same_gesture', 'same_upper_body', 'same_lower_body', 'related'] as const
export type FamilyKey = (typeof FAMILY_KEYS)[number]

export interface Families {
  same_gesture: MatchResult[]
  same_upper_body: MatchResult[]
  same_lower_body: MatchResult[]
  related: MatchResult[]
  counts: Record<FamilyKey, number>
}

const UPPER_REGIONS = rules.family_thresholds.same_upper_body.regions as RegionKey[]
const LOWER_REGIONS = rules.family_thresholds.same_lower_body.regions as RegionKey[]
const LEG_REGIONS: RegionKey[] = ['left_leg', 'right_leg']
const ARM_REGIONS: RegionKey[] = ['left_arm', 'right_arm']

function isSameGesture(m: MatchResult): boolean {
  const min = rules.family_thresholds.same_gesture.min_region_score
  const available = REGION_KEYS.filter((r) => m.regions[r] !== undefined)
  if (available.length === 0) return false
  return available.every((r) => (m.regions[r] as number) >= min)
}

function isSameUpperBody(m: MatchResult): boolean {
  const min = rules.family_thresholds.same_upper_body.min_region_score
  const maxExcluded = rules.family_thresholds.same_upper_body.excluded_leg_max_score
  const upperOk = UPPER_REGIONS.every((r) => {
    const score = m.regions[r]
    return score !== undefined && score >= min
  })
  if (!upperOk) return false
  return LEG_REGIONS.some((r) => {
    const score = m.regions[r]
    return score !== undefined && score < maxExcluded
  })
}

function isSameLowerBody(m: MatchResult): boolean {
  const min = rules.family_thresholds.same_lower_body.min_region_score
  const maxExcluded = rules.family_thresholds.same_lower_body.excluded_arm_max_score
  const lowerOk = LOWER_REGIONS.every((r) => {
    const score = m.regions[r]
    return score !== undefined && score >= min
  })
  if (!lowerOk) return false
  return ARM_REGIONS.some((r) => {
    const score = m.regions[r]
    return score !== undefined && score < maxExcluded
  })
}

/** Classify the top-60 pool (ARCHITECTURE §6): each entry lands in exactly one family. */
export function groupFamilies(pool: readonly MatchResult[]): Families {
  const same_gesture: MatchResult[] = []
  const same_upper_body: MatchResult[] = []
  const same_lower_body: MatchResult[] = []
  const related: MatchResult[] = []

  for (const m of pool) {
    if (isSameGesture(m)) same_gesture.push(m)
    else if (isSameUpperBody(m)) same_upper_body.push(m)
    else if (isSameLowerBody(m)) same_lower_body.push(m)
    else related.push(m)
  }

  return {
    same_gesture,
    same_upper_body,
    same_lower_body,
    related,
    counts: {
      same_gesture: same_gesture.length,
      same_upper_body: same_upper_body.length,
      same_lower_body: same_lower_body.length,
      related: related.length,
    },
  }
}
