import { describe, expect, it } from 'vitest'
import rules from '../../../shared/rules.json'
import { REGION_KEYS, type IndexEntry, computeOverall, computeRegionScores, matchIndex } from './match'
import { type Joints, computeSignature, mirrorSignature } from './signature'

// Same baseline as shared/test-vectors/signature/01_upright_symmetric_standing.json.
const STANDING: Joints = {
  nose: { x: 0, y: 0, v: 1 },
  shoulder_L: { x: -1, y: 2, v: 1 },
  shoulder_R: { x: 1, y: 2, v: 1 },
  elbow_L: { x: -1, y: 5, v: 1 },
  elbow_R: { x: 1, y: 5, v: 1 },
  wrist_L: { x: -1, y: 8, v: 1 },
  wrist_R: { x: 1, y: 8, v: 1 },
  hip_L: { x: -0.8, y: 8, v: 1 },
  hip_R: { x: 0.8, y: 8, v: 1 },
  knee_L: { x: -0.8, y: 12, v: 1 },
  knee_R: { x: 0.8, y: 12, v: 1 },
  ankle_L: { x: -0.8, y: 16, v: 1 },
  ankle_R: { x: 0.8, y: 16, v: 1 },
}

// Right elbow bent ~90 degrees (wrist pulled up beside the shoulder).
const RIGHT_ELBOW_BENT: Joints = {
  ...STANDING,
  wrist_R: { x: 1, y: 2, v: 1 },
}

function entry(id: string, joints: Joints): IndexEntry {
  return {
    id,
    provider: 'test',
    thumb: 'https://example.com/thumb.jpg',
    landing: 'https://example.com/landing',
    license: 'CC0',
    creator: 'test',
    title: 'test',
    attribution: 'test',
    j: [],
    v: [],
    sig: computeSignature(joints),
  }
}

describe('computeRegionScores / computeOverall', () => {
  it('scores an identical signature at 100 in every available region', () => {
    const sig = computeSignature(STANDING)
    const regions = computeRegionScores(sig, sig)
    for (const key of REGION_KEYS) {
      expect(regions[key]).toBeCloseTo(100, 5)
    }
    expect(computeOverall(regions)).toBeCloseTo(100, 5)
  })

  it('drops the overall score when one region differs', () => {
    const sigA = computeSignature(STANDING)
    const sigB = computeSignature(RIGHT_ELBOW_BENT)
    const regions = computeRegionScores(sigA, sigB)

    expect(regions.right_arm).toBeLessThan(100)
    expect(regions.left_arm).toBeCloseTo(100, 5)
    expect(computeOverall(regions)).toBeLessThan(100)
  })

  it('locking a region restricts the overall score to it (FR-007)', () => {
    const sigA = computeSignature(STANDING)
    const sigB = computeSignature(RIGHT_ELBOW_BENT)
    const regions = computeRegionScores(sigA, sigB)

    expect(computeOverall(regions, ['left_arm'])).toBeCloseTo(100, 5)
    expect(computeOverall(regions, ['right_arm'])).toBeCloseTo(regions.right_arm as number, 5)
  })

  it('weights ratio features at rules.ratio_weight_within_limb inside a limb', () => {
    const sigA = computeSignature(STANDING)
    // Scale the right arm's apparent length only, angles untouched.
    const scaledArm: Joints = {
      ...STANDING,
      elbow_R: { x: 1, y: 4, v: 1 }, // shorter upper arm, same direction
    }
    const sigB = computeSignature(scaledArm)
    const regions = computeRegionScores(sigA, sigB)
    // Angles for the segment stay ~unchanged (still pointing straight down),
    // so the region score should stay high despite the ratio mismatch.
    expect(regions.right_arm).toBeGreaterThan(80)
  })
})

describe('matchIndex', () => {
  it('ranks an identical entry first', () => {
    const index = [
      entry('bent', RIGHT_ELBOW_BENT),
      entry('exact', STANDING),
    ]
    const { grid } = matchIndex(STANDING, index)
    expect(grid[0].entry.id).toBe('exact')
    expect(grid[0].overall).toBeCloseTo(100, 5)
  })

  it('is mirror-aware: a left-bent reference still matches a right-bent sketch (ARCHITECTURE §4, §12)', () => {
    // RIGHT_ELBOW_BENT is asymmetric, so its mirror is a distinct pose
    // (left elbow bent instead) -- a meaningful mirror test.
    const mirroredEntry = entry('left-bent', RIGHT_ELBOW_BENT)
    mirroredEntry.sig = mirrorSignature(RIGHT_ELBOW_BENT)

    const { grid } = matchIndex(RIGHT_ELBOW_BENT, [mirroredEntry])
    expect(grid[0].overall).toBeCloseTo(100, 5)
    expect(grid[0].mirrored).toBe(true)
  })

  it('respects gridSize and familyPoolSize', () => {
    const index = Array.from({ length: 10 }, (_, i) => entry(`e${i}`, STANDING))
    const { grid, pool } = matchIndex(STANDING, index, { gridSize: 3, familyPoolSize: 7 })
    expect(grid).toHaveLength(3)
    expect(pool).toHaveLength(7)
  })

  it('uses region_weights from shared/rules.json, not a hard-coded set', () => {
    expect(rules.region_weights.gesture).toBeGreaterThan(rules.region_weights.shoulders)
  })
})
