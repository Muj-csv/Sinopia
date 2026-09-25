/**
 * Structural match (ARCHITECTURE.md §5). FR-004, FR-007.
 *
 * Ranks index entries by region-weighted signature similarity, mirror-aware,
 * with optional region locking (FR-007). Tolerances and weights come from
 * shared/rules.json, never hard-coded here (per CLAUDE.md rules).
 */
import rules from '../../../shared/rules.json'
import {
  type Joints,
  type Signature,
  type SignatureField,
  computeSignature,
  mirrorSignature,
} from './signature'

export const REGION_KEYS = [
  'torso',
  'shoulders',
  'pelvis',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
  'gesture',
] as const

export type RegionKey = (typeof REGION_KEYS)[number]

export interface IndexEntry {
  id: string
  provider: string
  thumb: string
  landing: string
  license: string
  license_version?: string
  creator: string
  title: string
  attribution: string
  j: number[]
  v: number[]
  sig: Signature
}

export interface MatchResult {
  entry: IndexEntry
  overall: number
  regions: Partial<Record<RegionKey, number>>
  mirrored: boolean
}

type FeatureKind = 'angle' | 'distance'
type NumericField = Exclude<SignatureField, 'weight_side'>

interface RegionFeature {
  field: NumericField
  kind: FeatureKind
  weight: number
}

// ARCHITECTURE.md §5 "Regions and features"; ratio_* features get
// rules.ratio_weight_within_limb inside their limb (§5, §6 rules.json).
const RATIO_WEIGHT = rules.ratio_weight_within_limb

const REGION_FEATURES: Record<RegionKey, RegionFeature[]> = {
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

const TOLERANCE: Record<FeatureKind, number> = {
  angle: rules.tolerances.angle_deg,
  distance: rules.tolerances.normalized_distance,
}

/** Wrap to (-180, 180]; angle diffs must go the short way round the circle. */
function wrapDeg(a: number): number {
  return (((a + 180) % 360) + 360) % 360 - 180
}

function featureDiff(kind: FeatureKind, a: number, b: number): number {
  return kind === 'angle' ? Math.abs(wrapDeg(a - b)) : Math.abs(a - b)
}

/** One region's similarity, 0-100, per ARCHITECTURE.md §5. undefined if no usable features. */
function regionScore(a: Signature, b: Signature, features: RegionFeature[]): number | undefined {
  let weightedError = 0
  let totalWeight = 0
  for (const { field, kind, weight } of features) {
    const av = a[field]
    const bv = b[field]
    if (typeof av !== 'number' || typeof bv !== 'number') continue
    const diff = featureDiff(kind, av, bv)
    weightedError += weight * (diff / TOLERANCE[kind])
    totalWeight += weight
  }
  if (totalWeight === 0) return undefined
  return 100 * Math.max(0, 1 - weightedError / totalWeight)
}

export function computeRegionScores(
  a: Signature,
  b: Signature,
): Partial<Record<RegionKey, number>> {
  const out: Partial<Record<RegionKey, number>> = {}
  for (const region of REGION_KEYS) {
    const score = regionScore(a, b, REGION_FEATURES[region])
    if (score !== undefined) out[region] = score
  }
  return out
}

export function computeOverall(
  regions: Partial<Record<RegionKey, number>>,
  lockedRegions?: readonly RegionKey[],
): number {
  const active =
    lockedRegions && lockedRegions.length > 0
      ? REGION_KEYS.filter((r) => lockedRegions.includes(r))
      : REGION_KEYS

  let weightedSum = 0
  let totalWeight = 0
  for (const region of active) {
    const score = regions[region]
    if (score === undefined) continue
    const weight = rules.region_weights[region]
    weightedSum += weight * score
    totalWeight += weight
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}

function matchOne(
  sketchSig: Signature,
  sketchMirrorSig: Signature,
  entry: IndexEntry,
  lockedRegions?: readonly RegionKey[],
): MatchResult {
  const regionsNormal = computeRegionScores(sketchSig, entry.sig)
  const regionsMirrored = computeRegionScores(sketchMirrorSig, entry.sig)
  const overallNormal = computeOverall(regionsNormal, lockedRegions)
  const overallMirrored = computeOverall(regionsMirrored, lockedRegions)

  return overallMirrored > overallNormal
    ? { entry, overall: overallMirrored, regions: regionsMirrored, mirrored: true }
    : { entry, overall: overallNormal, regions: regionsNormal, mirrored: false }
}

export interface MatchOptions {
  lockedRegions?: readonly RegionKey[]
  /** how many results to return for the results grid (FR-004). */
  gridSize?: number
  /** how many candidates feed the family grouping (ARCHITECTURE §6). */
  familyPoolSize?: number
}

export interface MatchOutput {
  /** top `gridSize` matches, for the results grid. */
  grid: MatchResult[]
  /** top `familyPoolSize` matches, for families.ts to group. */
  pool: MatchResult[]
}

const DEFAULT_GRID_SIZE = 24
const DEFAULT_FAMILY_POOL_SIZE = 60

/** Rank the corpus against a sketch's joints (ARCHITECTURE §5, §12: mirror-aware). */
export function matchIndex(
  sketchJoints: Joints,
  index: readonly IndexEntry[],
  options: MatchOptions = {},
): MatchOutput {
  const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE
  const familyPoolSize = Math.max(options.familyPoolSize ?? DEFAULT_FAMILY_POOL_SIZE, gridSize)

  const sketchSig = computeSignature(sketchJoints)
  const sketchMirrorSig = mirrorSignature(sketchJoints)

  const results = index.map((entry) =>
    matchOne(sketchSig, sketchMirrorSig, entry, options.lockedRegions),
  )
  results.sort((a, b) => b.overall - a.overall)

  const pool = results.slice(0, familyPoolSize)
  return { grid: pool.slice(0, gridSize), pool }
}
