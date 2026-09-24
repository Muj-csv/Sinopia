/**
 * Phase 1 acceptance: signature.ts must pass every vector in
 * shared/test-vectors/signature/ within 0.01 deg / 0.0001 on normalized
 * values (NFR-005), plus the mirror test (ARCHITECTURE §12).
 */
import { describe, expect, it } from 'vitest'
import {
  type Joints,
  type Signature,
  SIGNATURE_FIELDS,
  computeFeatures,
  computeSignature,
  mirrorNormalized,
  mirrorSignature,
  normalizeJoints,
} from './signature'

// Vite's import.meta.glob picks up every vector at build/test time.
const vectorModules = import.meta.glob('../../../shared/test-vectors/signature/*.json', {
  eager: true,
}) as Record<string, { default: RawVector }>

interface RawVector {
  name: string
  description: string
  joints: Record<string, { x: number; y: number; v: number }>
  expected: Record<string, number | string | null>
}

const vectors = Object.entries(vectorModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.default)

const ANGLE_TOLERANCE = 0.01
const RATIO_TOLERANCE = 0.0001

function toleranceFor(field: string): number {
  return field.startsWith('ratio_') ||
    ['head_offset_x', 'head_offset_y', 'balance_offset', 'curvature'].includes(field)
    ? RATIO_TOLERANCE
    : ANGLE_TOLERANCE
}

function toJoints(raw: RawVector['joints']): Joints {
  const joints: Joints = {}
  for (const [name, j] of Object.entries(raw)) {
    joints[name as keyof Joints] = { x: j.x, y: j.y, v: j.v }
  }
  return joints
}

describe('signature vectors', () => {
  it('found the shared vector files', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(10)
  })

  for (const vector of vectors) {
    it(vector.name, () => {
      const joints = toJoints(vector.joints)
      const actual = computeSignature(joints)

      for (const [field, expected] of Object.entries(vector.expected)) {
        const got = (actual as Record<string, unknown>)[field]
        if (expected === null) {
          expect(got, `${vector.name}.${field}`).toBeUndefined()
        } else if (typeof expected === 'string') {
          expect(got, `${vector.name}.${field}`).toBe(expected)
        } else {
          expect(got, `${vector.name}.${field}`).not.toBeUndefined()
          expect(got as number, `${vector.name}.${field}`).toBeCloseTo(expected, undefined)
          expect(
            Math.abs((got as number) - expected),
            `${vector.name}.${field}`,
          ).toBeLessThanOrEqual(toleranceFor(field))
        }
      }
    })
  }
})

describe('mirror', () => {
  it('is an involution (mirroring twice returns the original)', () => {
    const raw = Object.values(vectorModules).find((m) => m.default.name === 'weight_on_right_leg')!.default
    const joints = toJoints(raw.joints)
    const normalized = normalizeJoints(joints)
    const twice = computeFeatures(mirrorNormalized(mirrorNormalized(normalized)))
    const once = computeSignature(joints)
    assertSignaturesClose(once, twice)
  })

  it('matches the geometric opposite (vector 06 mirrored == vector 07)', () => {
    const v6raw = Object.values(vectorModules).find((m) => m.default.name === 'weight_on_right_leg')!.default
    const v7raw = Object.values(vectorModules).find((m) => m.default.name === 'weight_on_left_leg')!.default
    const mirrored = mirrorSignature(toJoints(v6raw.joints))
    const direct = computeSignature(toJoints(v7raw.joints))
    assertSignaturesClose(mirrored, direct, 1e-6)
  })
})

function assertSignaturesClose(a: Signature, b: Signature, tol = 1e-9) {
  for (const field of SIGNATURE_FIELDS) {
    const av = (a as Record<string, unknown>)[field]
    const bv = (b as Record<string, unknown>)[field]
    if (typeof av === 'string' || typeof bv === 'string') {
      expect(av, field).toBe(bv)
    } else if (av === undefined || bv === undefined) {
      expect(av, field).toBeUndefined()
      expect(bv, field).toBeUndefined()
    } else {
      expect(Math.abs((av as number) - (bv as number)), field).toBeLessThanOrEqual(tol)
    }
  }
}
