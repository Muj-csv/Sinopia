/**
 * PHASE-3 task 3 acceptance (ARCHITECTURE.md §12): region formula with
 * known deltas, missing-feature handling, locked regions (FR-007), the
 * mirror test ("a mirrored skeleton scores 100 against the original with
 * mirror on"), and ranking.
 */
import { describe, expect, it } from 'vitest'
import rules from '../../../shared/rules.json'
import { computeSignature, mirrorSignature, type Joints, type Signature } from './signature'
import {
  type Candidate,
  REGIONS,
  TOP_K_FAMILIES,
  TOP_K_GRID,
  matchSignature,
  rankCandidates,
  regionScore,
} from './match'

function sig(overrides: Partial<Signature>): Signature {
  return { ...overrides }
}

describe('regionScore', () => {
  it('scores 100 when the region is identical', () => {
    const a = sig({ shoulder_tilt: 12 })
    expect(regionScore(a, a, 'shoulders')).toBe(100)
  })

  it('applies the documented formula: 100 x max(0, 1 - |delta| / tolerance)', () => {
    // torso_lean is an angle feature, tolerance 45deg (shared/rules.json).
    const a = sig({ torso_lean: 0 })
    const b = sig({ torso_lean: 22.5 })
    expect(regionScore(a, b, 'torso')).toBeCloseTo(50, 5)
  })

  it('wraps angle deltas on the circle', () => {
    const a = sig({ shoulder_tilt: -170 })
    const b = sig({ shoulder_tilt: 170 })
    // True angular delta is 20deg, not 340deg.
    expect(regionScore(a, b, 'shoulders')).toBeCloseTo(100 * (1 - 20 / 45), 5)
  })

  it('floors at 0 rather than going negative', () => {
    const a = sig({ shoulder_tilt: 0 })
    const b = sig({ shoulder_tilt: 180 })
    expect(regionScore(a, b, 'shoulders')).toBe(0)
  })

  it('skips a feature missing on either side', () => {
    const a = sig({ torso_lean: 0, head_offset_x: 0, head_offset_y: 0 })
    const b = sig({ torso_lean: 0, head_offset_x: undefined, head_offset_y: 0 })
    // Only torso_lean + head_offset_y count; both match exactly => 100.
    expect(regionScore(a, b, 'torso')).toBe(100)
  })

  it('returns undefined when no feature in the region is usable', () => {
    const a = sig({ shoulder_tilt: undefined })
    const b = sig({ shoulder_tilt: 10 })
    expect(regionScore(a, b, 'shoulders')).toBeUndefined()
  })

  it('weights ratio features by ratio_weight_within_limb inside a limb', () => {
    // upper_arm_L off by tolerance (=> similarity 0), ratio_upper_arm_L identical (=> similarity 1).
    const a = sig({ upper_arm_L: 0, ratio_upper_arm_L: 0.5 })
    const b = sig({ upper_arm_L: rules.tolerances.angle_deg, ratio_upper_arm_L: 0.5 })
    const w = rules.ratio_weight_within_limb
    // weighted mean of (delta/tol): (1*1 + w*0) / (1+w) => score = 100*(1 - that)
    const expected = 100 * (1 - 1 / (1 + w))
    expect(regionScore(a, b, 'left_arm')).toBeCloseTo(expected, 5)
  })
})

describe('matchSignature', () => {
  it('averages available regions weighted by region_weights, ignoring excluded regions', () => {
    const a = sig({ shoulder_tilt: 0 })
    const b = sig({ shoulder_tilt: 0 })
    const result = matchSignature(a, undefined, b)
    expect(result?.overall).toBe(100)
    expect(result?.regions).toEqual({ shoulders: 100 })
    expect(result?.mirrored).toBe(false)
  })

  it('returns undefined when nothing is comparable', () => {
    expect(matchSignature({}, undefined, {})).toBeUndefined()
  })

  it('FR-007: locked regions zero out every other region in the overall score', () => {
    const a = sig({ shoulder_tilt: 0, torso_lean: 0 })
    const b = sig({ shoulder_tilt: 0, torso_lean: 180 }) // torso would drag the score down
    const locked = matchSignature(a, undefined, b, { lockedRegions: ['shoulders'] })
    expect(locked?.overall).toBe(100)

    const unlocked = matchSignature(a, undefined, b)
    expect(unlocked?.overall).toBeLessThan(100)
  })

  it('mirror test: a mirrored skeleton scores 100 against the original with mirror on', () => {
    const joints: Joints = {
      nose: { x: 0, y: 0, v: 1 },
      shoulder_L: { x: -1, y: 2, v: 1 },
      shoulder_R: { x: 1, y: 2, v: 1 },
      elbow_L: { x: -1, y: 5, v: 1 },
      elbow_R: { x: 1, y: 5, v: 1 },
      wrist_L: { x: -1, y: 8, v: 1 },
      wrist_R: { x: 3, y: 5, v: 1 }, // asymmetric: right forearm bent sideways
      hip_L: { x: -0.8, y: 8, v: 1 },
      hip_R: { x: 0.8, y: 8, v: 1 },
      knee_L: { x: -0.8, y: 12, v: 1 },
      knee_R: { x: 0.8, y: 12, v: 1 },
      ankle_L: { x: -0.8, y: 16, v: 1 },
      ankle_R: { x: 0.8, y: 16, v: 1 },
    }

    const query = computeSignature(joints)
    const mirroredQuery = mirrorSignature(joints)
    const mirroredReference = mirrorSignature(joints) // "a mirrored skeleton" of the same pose

    const withMirror = matchSignature(query, mirroredQuery, mirroredReference)
    expect(withMirror?.overall).toBeCloseTo(100, 5)
    expect(withMirror?.mirrored).toBe(true)

    const withoutMirror = matchSignature(query, undefined, mirroredReference)
    expect(withoutMirror?.overall).toBeLessThan(100)
  })
})

describe('rankCandidates', () => {
  const joints: Joints = {
    nose: { x: 0, y: 0, v: 1 },
    shoulder_L: { x: -1, y: 2, v: 1 },
    shoulder_R: { x: 1, y: 2, v: 1 },
    hip_L: { x: -0.8, y: 8, v: 1 },
    hip_R: { x: 0.8, y: 8, v: 1 },
  }
  const query = computeSignature(joints)

  it('sorts candidates best-first', () => {
    const candidates: Candidate<string>[] = [
      { entry: 'far', sig: sig({ shoulder_tilt: (query.shoulder_tilt ?? 0) + 40 }) },
      { entry: 'exact', sig: query },
      { entry: 'near', sig: sig({ shoulder_tilt: (query.shoulder_tilt ?? 0) + 5 }) },
    ]
    const ranked = rankCandidates(joints, candidates)
    expect(ranked.map((r) => r.entry)).toEqual(['exact', 'near', 'far'])
    expect(ranked[0].overall).toBeGreaterThanOrEqual(ranked[1].overall)
    expect(ranked[1].overall).toBeGreaterThanOrEqual(ranked[2].overall)
  })

  it('drops candidates with no comparable region', () => {
    const candidates: Candidate<string>[] = [{ entry: 'empty', sig: {} }]
    expect(rankCandidates(joints, candidates)).toEqual([])
  })
})

describe('constants', () => {
  it('match ARCHITECTURE.md §5 top-K values', () => {
    expect(TOP_K_FAMILIES).toBe(60)
    expect(TOP_K_GRID).toBe(24)
  })

  it('REGIONS matches shared/rules.json region_weights keys', () => {
    expect(REGIONS.sort()).toEqual(Object.keys(rules.region_weights).sort())
  })
})
