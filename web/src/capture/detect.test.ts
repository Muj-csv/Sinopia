/**
 * Pure landmark-mapping and acceptance-threshold logic only. Model loading
 * and actual PoseLandmarker.detect() calls need a real WASM runtime and a
 * <canvas>/<video> element, so they're verified manually in the browser,
 * not here (jsdom has no MediaPipe/WASM support).
 */
import { describe, expect, it } from 'vitest'
import { CORE_JOINT_NAMES, VISIBILITY_THRESHOLD } from '../pose/signature'
import {
  MIN_VISIBLE_CORE_JOINTS,
  type RawLandmark,
  countVisible,
  isUsableDetection,
  landmarksToJoints,
} from './detect'

// A full 33-point MediaPipe landmark array, all visible, arbitrary coordinates.
function fullLandmarks(overrides: Record<number, Partial<RawLandmark>> = {}): RawLandmark[] {
  return Array.from({ length: 33 }, (_, i) => ({
    x: i / 33,
    y: 1 - i / 33,
    visibility: 1,
    ...overrides[i],
  }))
}

describe('landmarksToJoints', () => {
  it('maps every core joint name to the matching MediaPipe landmark index', () => {
    const landmarks = fullLandmarks()
    const joints = landmarksToJoints(landmarks)
    expect(Object.keys(joints).sort()).toEqual([...CORE_JOINT_NAMES].sort())
    expect(joints.nose).toEqual({ x: landmarks[0].x, y: landmarks[0].y, v: 1 })
    expect(joints.shoulder_L).toEqual({ x: landmarks[11].x, y: landmarks[11].y, v: 1 })
    expect(joints.ankle_R).toEqual({ x: landmarks[28].x, y: landmarks[28].y, v: 1 })
  })

  it('defaults visibility to 1 when the landmark omits it', () => {
    const landmarks = fullLandmarks()
    landmarks[0] = { x: 0.5, y: 0.5 }
    const joints = landmarksToJoints(landmarks)
    expect(joints.nose?.v).toBe(1)
  })
})

describe('countVisible', () => {
  it('counts all 13 when every joint clears the visibility threshold', () => {
    const joints = landmarksToJoints(fullLandmarks())
    expect(countVisible(joints)).toBe(13)
  })

  it('excludes joints below VISIBILITY_THRESHOLD', () => {
    const joints = landmarksToJoints(
      fullLandmarks({ 0: { visibility: VISIBILITY_THRESHOLD - 0.01 } }),
    )
    expect(countVisible(joints)).toBe(12)
  })

  it('treats visibility exactly at the threshold as visible', () => {
    const joints = landmarksToJoints(fullLandmarks({ 0: { visibility: VISIBILITY_THRESHOLD } }))
    expect(countVisible(joints)).toBe(13)
  })
})

describe('isUsableDetection', () => {
  it('accepts exactly one person with enough visible joints', () => {
    expect(isUsableDetection(1, MIN_VISIBLE_CORE_JOINTS)).toBe(true)
  })

  it('rejects zero people', () => {
    expect(isUsableDetection(0, 13)).toBe(false)
  })

  it('rejects more than one person, mirroring ingest.py', () => {
    expect(isUsableDetection(2, 13)).toBe(false)
  })

  it('rejects one person with too few visible joints', () => {
    expect(isUsableDetection(1, MIN_VISIBLE_CORE_JOINTS - 1)).toBe(false)
  })
})
