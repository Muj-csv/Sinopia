/** Seeds joint positions for the editor: detected values, or a generic upright layout otherwise (ADR-005). */
import { CORE_JOINT_NAMES, type JointName, type Joints } from '../pose/signature'

// Generic upright figure, image-relative [0,1] fractions (x right, y down),
// used to seed joints that have no detected position (manual placement).
const DEFAULT_LAYOUT: Record<JointName, [number, number]> = {
  nose: [0.5, 0.12],
  shoulder_L: [0.4, 0.22],
  shoulder_R: [0.6, 0.22],
  elbow_L: [0.35, 0.4],
  elbow_R: [0.65, 0.4],
  wrist_L: [0.32, 0.56],
  wrist_R: [0.68, 0.56],
  hip_L: [0.43, 0.56],
  hip_R: [0.57, 0.56],
  knee_L: [0.42, 0.76],
  knee_R: [0.58, 0.76],
  ankle_L: [0.41, 0.94],
  ankle_R: [0.59, 0.94],
}

export function seedPositions(initial: Joints | undefined): Record<JointName, [number, number]> {
  const seeded = {} as Record<JointName, [number, number]>
  for (const name of CORE_JOINT_NAMES) {
    const j = initial?.[name]
    seeded[name] = j !== undefined ? [j.x, j.y] : DEFAULT_LAYOUT[name]
  }
  return seeded
}

/**
 * Fills in any joints missing from detection (or all of them, for fully
 * manual placement) with a generic upright layout. Call this once, in the
 * parent, when detection finishes -- keeps the initial "Continue" enabled
 * without JointEditor syncing state back up on mount.
 */
export function seedInitialJoints(detected: Joints | undefined): Joints {
  const positions = seedPositions(detected)
  const joints: Joints = {}
  for (const name of CORE_JOINT_NAMES) {
    const [x, y] = positions[name]
    joints[name] = { x, y, v: 1 }
  }
  return joints
}
