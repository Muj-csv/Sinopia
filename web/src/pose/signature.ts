/**
 * Pose signature (ARCHITECTURE.md §3-4). FR-003, NFR-005.
 *
 * Identical in TypeScript and ingest/signature.py, within 0.01deg / 0.0001
 * on normalized values. Any change here must be mirrored there and
 * re-checked against shared/test-vectors/signature/*.json.
 *
 * Coordinate convention (ARCHITECTURE.md §3):
 *   Input joints are image-plane coordinates, x increasing right, y
 *   increasing down (typical image / MediaPipe landmark convention).
 *   We convert to y-up, then place the origin at the hip midpoint and
 *   scale by torso length (hip midpoint -> shoulder midpoint distance).
 *   No rotation normalization: a lying figure must not match a standing
 *   one (ADR-002, ADR-003).
 *
 * Underspecified formula, documented here rather than in ARCHITECTURE.md:
 *   weight_side picks the ankle that is both closer under the shoulder-hip
 *   centre (horizontally) and lower in the frame. We score each ankle as
 *   `abs(ankle.x - center.x) + max(0, ankle.y - min(ankle_L.y, ankle_R.y))`
 *   (lower score wins; "even" if the scores are within an epsilon). The
 *   first term rewards being under the centre; the second penalizes an
 *   ankle for being higher than the lower of the two.
 */

export const VISIBILITY_THRESHOLD = 0.3
const WEIGHT_SIDE_EPSILON = 1e-6

export const CORE_JOINT_NAMES = [
  'nose',
  'shoulder_L', 'shoulder_R',
  'elbow_L', 'elbow_R',
  'wrist_L', 'wrist_R',
  'hip_L', 'hip_R',
  'knee_L', 'knee_R',
  'ankle_L', 'ankle_R',
] as const

export type JointName = (typeof CORE_JOINT_NAMES)[number]

// (left, right) name pairs, used by mirrorSignature().
const MIRROR_PAIRS: [JointName, JointName][] = [
  ['shoulder_L', 'shoulder_R'],
  ['elbow_L', 'elbow_R'],
  ['wrist_L', 'wrist_R'],
  ['hip_L', 'hip_R'],
  ['knee_L', 'knee_R'],
  ['ankle_L', 'ankle_R'],
]

export const SIGNATURE_FIELDS = [
  'torso_lean', 'head_offset_x', 'head_offset_y',
  'shoulder_tilt', 'pelvis_tilt', 'tilt_contrast',
  'upper_arm_L', 'upper_arm_R', 'forearm_L', 'forearm_R', 'elbow_L', 'elbow_R',
  'thigh_L', 'thigh_R', 'shin_L', 'shin_R', 'knee_L', 'knee_R',
  'ratio_upper_arm_L', 'ratio_upper_arm_R', 'ratio_forearm_L', 'ratio_forearm_R',
  'ratio_thigh_L', 'ratio_thigh_R', 'ratio_shin_L', 'ratio_shin_R',
  'balance_offset', 'weight_side', 'line_of_action', 'curvature',
] as const

export type SignatureField = (typeof SIGNATURE_FIELDS)[number]

export interface Joint {
  x: number
  y: number
  v: number // visibility, 0..1
}

export type Joints = Partial<Record<JointName, Joint>>
export type Point = [number, number]
export type NormalizedJoints = Partial<Record<JointName, Point>>
export type WeightSide = 'L' | 'R' | 'even'
export type Signature = Partial<Record<Exclude<SignatureField, 'weight_side'>, number>> & {
  weight_side?: WeightSide
}

// --- vector helpers ---------------------------------------------------------

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const scale = (a: Point, k: number): Point => [a[0] * k, a[1] * k]
const norm = (v: Point): number => Math.hypot(v[0], v[1])
const dot = (a: Point, b: Point): number => a[0] * b[0] + a[1] * b[1]
const cross = (a: Point, b: Point): number => a[0] * b[1] - a[1] * b[0]

/** Angle from the positive x-axis, counter-clockwise positive (y-up). */
const angleDeg = (v: Point): number => (Math.atan2(v[1], v[0]) * 180) / Math.PI

/** Wrap to (-180, 180]. */
const wrapDeg = (a: number): number => ((a + 180) % 360 + 360) % 360 - 180

function interiorAngleDeg(joint: Point, a: Point, b: Point): number | undefined {
  const v1 = sub(a, joint)
  const v2 = sub(b, joint)
  const n1 = norm(v1)
  const n2 = norm(v2)
  if (n1 === 0 || n2 === 0) return undefined
  const cosA = Math.max(-1, Math.min(1, dot(v1, v2) / (n1 * n2)))
  return (Math.acos(cosA) * 180) / Math.PI
}

const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

// --- normalization -----------------------------------------------------------

export function normalizeJoints(joints: Joints): NormalizedJoints | undefined {
  const required: JointName[] = ['shoulder_L', 'shoulder_R', 'hip_L', 'hip_R']
  for (const name of required) {
    const j = joints[name]
    if (j === undefined || j.v < VISIBILITY_THRESHOLD) return undefined
  }

  const yup: Partial<Record<JointName, Point>> = {}
  for (const name of CORE_JOINT_NAMES) {
    const j = joints[name]
    if (j !== undefined && j.v >= VISIBILITY_THRESHOLD) yup[name] = [j.x, -j.y]
  }

  const hipMid = midpoint(yup.hip_L!, yup.hip_R!)
  const shoulderMid = midpoint(yup.shoulder_L!, yup.shoulder_R!)
  const torsoLength = norm(sub(shoulderMid, hipMid))
  if (torsoLength < 1e-9) return undefined

  const normalized: NormalizedJoints = {}
  for (const name of CORE_JOINT_NAMES) {
    const p = yup[name]
    if (p !== undefined) normalized[name] = scale(sub(p, hipMid), 1 / torsoLength)
  }
  return normalized
}

function mid(normalized: NormalizedJoints, a: JointName, b: JointName): Point | undefined {
  const pa = normalized[a]
  const pb = normalized[b]
  if (pa === undefined || pb === undefined) return undefined
  return midpoint(pa, pb)
}

// --- feature computation -------------------------------------------------------

function emptySignature(): Signature {
  return {}
}

interface LimbSpec {
  segmentField: Exclude<SignatureField, 'weight_side'>
  bendField: Exclude<SignatureField, 'weight_side'> | null
  ratioField: Exclude<SignatureField, 'weight_side'>
  proximal: JointName
  distal: JointName
  bendFar: JointName | null
}

const LIMBS: LimbSpec[] = [
  { segmentField: 'upper_arm_L', bendField: null, ratioField: 'ratio_upper_arm_L', proximal: 'shoulder_L', distal: 'elbow_L', bendFar: null },
  { segmentField: 'upper_arm_R', bendField: null, ratioField: 'ratio_upper_arm_R', proximal: 'shoulder_R', distal: 'elbow_R', bendFar: null },
  { segmentField: 'forearm_L', bendField: 'elbow_L', ratioField: 'ratio_forearm_L', proximal: 'elbow_L', distal: 'wrist_L', bendFar: 'shoulder_L' },
  { segmentField: 'forearm_R', bendField: 'elbow_R', ratioField: 'ratio_forearm_R', proximal: 'elbow_R', distal: 'wrist_R', bendFar: 'shoulder_R' },
  { segmentField: 'thigh_L', bendField: null, ratioField: 'ratio_thigh_L', proximal: 'hip_L', distal: 'knee_L', bendFar: null },
  { segmentField: 'thigh_R', bendField: null, ratioField: 'ratio_thigh_R', proximal: 'hip_R', distal: 'knee_R', bendFar: null },
  { segmentField: 'shin_L', bendField: 'knee_L', ratioField: 'ratio_shin_L', proximal: 'knee_L', distal: 'ankle_L', bendFar: 'hip_L' },
  { segmentField: 'shin_R', bendField: 'knee_R', ratioField: 'ratio_shin_R', proximal: 'knee_R', distal: 'ankle_R', bendFar: 'hip_R' },
]

export function computeFeatures(normalized: NormalizedJoints | undefined): Signature {
  if (normalized === undefined) return emptySignature()

  const sig: Signature = emptySignature()

  const shoulderMid = mid(normalized, 'shoulder_L', 'shoulder_R')
  const hipMid = mid(normalized, 'hip_L', 'hip_R') // always (0, 0) post-normalization

  if (shoulderMid !== undefined && hipMid !== undefined) {
    sig.torso_lean = wrapDeg(90 - angleDeg(sub(shoulderMid, hipMid)))
  }

  const nose = normalized.nose
  if (nose !== undefined && shoulderMid !== undefined) {
    sig.head_offset_x = nose[0] - shoulderMid[0]
    sig.head_offset_y = nose[1] - shoulderMid[1]
  }

  const sL = normalized.shoulder_L
  const sR = normalized.shoulder_R
  if (sL !== undefined && sR !== undefined) sig.shoulder_tilt = angleDeg(sub(sR, sL))

  const hL = normalized.hip_L
  const hR = normalized.hip_R
  if (hL !== undefined && hR !== undefined) sig.pelvis_tilt = angleDeg(sub(hR, hL))

  if (sig.shoulder_tilt !== undefined && sig.pelvis_tilt !== undefined) {
    sig.tilt_contrast = wrapDeg(sig.shoulder_tilt - sig.pelvis_tilt)
  }

  for (const limb of LIMBS) {
    const proximal = normalized[limb.proximal]
    const distal = normalized[limb.distal]
    if (proximal !== undefined && distal !== undefined) {
      const vec = sub(distal, proximal)
      sig[limb.segmentField] = angleDeg(vec)
      sig[limb.ratioField] = norm(vec)
    }
    if (limb.bendField !== null && limb.bendFar !== null) {
      const far = normalized[limb.bendFar]
      const joint = normalized[limb.proximal] // elbow or knee itself
      if (joint !== undefined && far !== undefined && distal !== undefined) {
        const bend = interiorAngleDeg(joint, far, distal)
        if (bend !== undefined) sig[limb.bendField] = bend
      }
    }
  }

  const aL = normalized.ankle_L
  const aR = normalized.ankle_R
  if (aL !== undefined && aR !== undefined && shoulderMid !== undefined) {
    const center = scale(shoulderMid, 0.5) // midpoint of shoulderMid and hipMid=(0,0)
    const ankleMid = midpoint(aL, aR)
    sig.balance_offset = center[0] - ankleMid[0]

    const lowerY = Math.min(aL[1], aR[1])
    const scoreL = Math.abs(aL[0] - center[0]) + Math.max(0, aL[1] - lowerY)
    const scoreR = Math.abs(aR[0] - center[0]) + Math.max(0, aR[1] - lowerY)
    const weightSide: WeightSide =
      Math.abs(scoreL - scoreR) < WEIGHT_SIDE_EPSILON ? 'even' : scoreL < scoreR ? 'L' : 'R'
    sig.weight_side = weightSide

    const support = weightSide === 'L' ? aL : weightSide === 'R' ? aR : ankleMid
    if (nose !== undefined) {
      const vec = sub(nose, support)
      sig.line_of_action = angleDeg(vec)
      const lineLen = norm(vec)
      if (lineLen > 1e-9) {
        // signed perpendicular distance of hipMid=(0,0) from the line
        // through support -> nose.
        const toOrigin = sub([0, 0], support)
        sig.curvature = cross(vec, toOrigin) / lineLen
      }
    }
  }

  return sig
}

export function computeSignature(joints: Joints): Signature {
  return computeFeatures(normalizeJoints(joints))
}

/**
 * Reflect a normalized joint set through its own vertical (hip) axis and
 * swap L/R labels. Recomputing features on the result is equivalent to
 * "swap L/R labels and negate x-dependent angles" (ARCHITECTURE §4), but
 * derived geometrically instead of hand-flipping each feature's sign.
 */
export function mirrorNormalized(normalized: NormalizedJoints | undefined): NormalizedJoints | undefined {
  if (normalized === undefined) return undefined

  const flip = (p: Point | undefined): Point | undefined => (p === undefined ? undefined : [-p[0], p[1]])

  const mirrored: NormalizedJoints = { nose: flip(normalized.nose) }
  for (const [left, right] of MIRROR_PAIRS) {
    mirrored[right] = flip(normalized[left])
    mirrored[left] = flip(normalized[right])
  }
  return mirrored
}

export function mirrorSignature(joints: Joints): Signature {
  return computeFeatures(mirrorNormalized(normalizeJoints(joints)))
}
