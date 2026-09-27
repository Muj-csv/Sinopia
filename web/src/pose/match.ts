/**
 * Structural match (ARCHITECTURE.md §5, FR-004, FR-007). Compares a query
 * signature against reference signatures from the index, region by region,
 * reading every tolerance and weight from shared/rules.json -- never
 * hard-coded (CLAUDE.md).
 *
 * Region similarity: 100 x max(0, 1 - weighted-mean(|delta| / tolerance))
 * over that region's available features (missing features skipped; a
 * region with none usable is excluded). Overall: weighted mean of the
 * available regions, region_weights from rules.json, ratios weighted
 * ratio_weight_within_limb inside their own limb. Locked regions zero out
 * every other region's weight (FR-007). Mirror: score both the query and
 * its mirror against each reference, keep whichever is better.
 */
import rules from '../../../shared/rules.json'
import {
  computeSignature,
  mirrorSignature,
  type Joints,
  type Signature,
  type SignatureField,
} from './signature'

export type Region =
  | 'torso'
  | 'shoulders'
  | 'pelvis'
  | 'left_arm'
  | 'right_arm'
  | 'left_leg'
  | 'right_leg'
  | 'gesture'

export const REGIONS: Region[] = [
  'torso',
  'shoulders',
  'pelvis',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
  'gesture',
]

type FeatureKind = 'angle' | 'distance'
type ScalarField = Exclude<SignatureField, 'weight_side'>

interface RegionFeature {
  field: ScalarField
  kind: FeatureKind
  weight: number
}

const RATIO_WEIGHT = rules.ratio_weight_within_limb

// ARCHITECTURE.md §5 "Regions and features".
const REGION_FEATURES: Record<Region, RegionFeature[]> = {
  torso: [
    { field: 'torso_lean', kind: 'angle', weight: 1 },
    { field: 'head_offset_x', kind: 'distance', weight: 1 },
    { field: 'head_offset_y', kind: 'distance', weight: 1 },
  ],
  shoulders: [{ field: 'shoulder_tilt', kind: 'angle', weight: 1 }],
  pelvis: [
    { field: 'pelvis_tilt', kind: 'angle', weight: 1 },
    { field: 'tilt_contrast', kind: 'angle', weight: 1 },
  ],
  left_arm: [
    { field: 'upper_arm_L', kind: 'angle', weight: 1 },
    { field: 'forearm_L', kind: 'angle', weight: 1 },
    { field: 'elbow_L', kind: 'angle', weight: 1 },
    { field: 'ratio_upper_arm_L', kind: 'distance', weight: RATIO_WEIGHT },
    { field: 'ratio_forearm_L', kind: 'distance', weight: RATIO_WEIGHT },
  ],
  right_arm: [
    { field: 'upper_arm_R', kind: 'angle', weight: 1 },
    { field: 'forearm_R', kind: 'angle', weight: 1 },
    { field: 'elbow_R', kind: 'angle', weight: 1 },
    { field: 'ratio_upper_arm_R', kind: 'distance', weight: RATIO_WEIGHT },
    { field: 'ratio_forearm_R', kind: 'distance', weight: RATIO_WEIGHT },
  ],
  left_leg: [
    { field: 'thigh_L', kind: 'angle', weight: 1 },
    { field: 'shin_L', kind: 'angle', weight: 1 },
    { field: 'knee_L', kind: 'angle', weight: 1 },
    { field: 'ratio_thigh_L', kind: 'distance', weight: RATIO_WEIGHT },
    { field: 'ratio_shin_L', kind: 'distance', weight: RATIO_WEIGHT },
  ],
  right_leg: [
    { field: 'thigh_R', kind: 'angle', weight: 1 },
    { field: 'shin_R', kind: 'angle', weight: 1 },
    { field: 'knee_R', kind: 'angle', weight: 1 },
    { field: 'ratio_thigh_R', kind: 'distance', weight: RATIO_WEIGHT },
    { field: 'ratio_shin_R', kind: 'distance', weight: RATIO_WEIGHT },
  ],
  gesture: [
    { field: 'line_of_action', kind: 'angle', weight: 1 },
    { field: 'curvature', kind: 'distance', weight: 1 },
    { field: 'balance_offset', kind: 'distance', weight: 1 },
  ],
}

function wrapDeg(a: number): number {
  return (((a + 180) % 360) + 360) % 360 - 180
}

/** |Delta|, computed on the circle for angles (ARCHITECTURE.md §5). */
function featureDelta(kind: FeatureKind, a: number, b: number): number {
  return kind === 'angle' ? Math.abs(wrapDeg(a - b)) : Math.abs(a - b)
}

/** Region similarity (0-100), or undefined if no feature in the region is usable in both. */
export function regionScore(a: Signature, b: Signature, region: Region): number | undefined {
  const tolerance = { angle: rules.tolerances.angle_deg, distance: rules.tolerances.normalized_distance }
  let weightedRatio = 0
  let weightTotal = 0
  for (const f of REGION_FEATURES[region]) {
    const av = a[f.field]
    const bv = b[f.field]
    if (av == null || bv == null) continue
    const delta = featureDelta(f.kind, av, bv)
    weightedRatio += f.weight * (delta / tolerance[f.kind])
    weightTotal += f.weight
  }
  if (weightTotal === 0) return undefined
  return 100 * Math.max(0, 1 - weightedRatio / weightTotal)
}

function overallScore(
  regionScores: Partial<Record<Region, number>>,
  lockedRegions?: readonly Region[],
): number | undefined {
  const weights: Record<Region, number> = rules.region_weights
  const locked = lockedRegions !== undefined && lockedRegions.length > 0
  let weightedSum = 0
  let weightTotal = 0
  for (const region of REGIONS) {
    const score = regionScores[region]
    if (score === undefined) continue
    const weight = locked ? (lockedRegions.includes(region) ? weights[region] : 0) : weights[region]
    if (weight === 0) continue
    weightedSum += score * weight
    weightTotal += weight
  }
  return weightTotal === 0 ? undefined : weightedSum / weightTotal
}

export interface MatchOptions {
  /** FR-007: only these regions count toward `overall`; all others get weight 0. */
  lockedRegions?: readonly Region[]
  /** Score the mirror too and keep the better result. Default true (ARCHITECTURE.md §4). */
  allowMirror?: boolean
}

export interface MatchScores {
  overall: number
  regions: Partial<Record<Region, number>>
  mirrored: boolean
}

function scoreAgainst(
  query: Signature,
  reference: Signature,
  lockedRegions?: readonly Region[],
): Omit<MatchScores, 'mirrored'> | undefined {
  const regions: Partial<Record<Region, number>> = {}
  for (const region of REGIONS) {
    const score = regionScore(query, reference, region)
    if (score !== undefined) regions[region] = score
  }
  const overall = overallScore(regions, lockedRegions)
  return overall === undefined ? undefined : { overall, regions }
}

/**
 * Scores a reference against a query signature and (if provided) its
 * mirror, keeping whichever is better -- ARCHITECTURE.md §4's mirror
 * toggle, "default on".
 */
export function matchSignature(
  query: Signature,
  mirroredQuery: Signature | undefined,
  reference: Signature,
  options: MatchOptions = {},
): MatchScores | undefined {
  const straight = scoreAgainst(query, reference, options.lockedRegions)
  if (mirroredQuery === undefined) {
    return straight === undefined ? undefined : { ...straight, mirrored: false }
  }
  const mirrored = scoreAgainst(mirroredQuery, reference, options.lockedRegions)
  if (mirrored === undefined) {
    return straight === undefined ? undefined : { ...straight, mirrored: false }
  }
  if (straight === undefined || mirrored.overall > straight.overall) {
    return { ...mirrored, mirrored: true }
  }
  return { ...straight, mirrored: false }
}

export interface Candidate<T> {
  entry: T
  sig: Signature
}

export interface RankedMatch<T> extends MatchScores {
  entry: T
}

// ARCHITECTURE.md §5: top 60 for families, top 24 for the results grid.
export const TOP_K_FAMILIES = 60
export const TOP_K_GRID = 24

/**
 * Scores every candidate against a sketch's joints and returns them sorted
 * best-first. A linear scan (ARCHITECTURE.md §5) -- callers slice the top
 * TOP_K_FAMILIES / TOP_K_GRID.
 */
export function rankCandidates<T>(
  queryJoints: Joints,
  candidates: readonly Candidate<T>[],
  options: MatchOptions = {},
): RankedMatch<T>[] {
  const allowMirror = options.allowMirror ?? true
  const query = computeSignature(queryJoints)
  const mirroredQuery = allowMirror ? mirrorSignature(queryJoints) : undefined

  const results: RankedMatch<T>[] = []
  for (const candidate of candidates) {
    const scores = matchSignature(query, mirroredQuery, candidate.sig, options)
    if (scores !== undefined) results.push({ ...scores, entry: candidate.entry })
  }
  results.sort((a, b) => b.overall - a.overall)
  return results
}
