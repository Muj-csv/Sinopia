import { CORE_JOINT_NAMES, type Joint, type JointName, type Joints } from '../pose/signature'

/**
 * Generic standing-figure layout, normalized image-plane coordinates
 * (x right, y down), roughly centered in frame. Seeds manual placement
 * (ADR-005) so the user drags joints into place on top of their sketch
 * rather than starting from nothing.
 */
export const TEMPLATE_JOINTS: Record<JointName, [number, number]> = {
  nose: [0.5, 0.12],
  shoulder_L: [0.42, 0.22],
  shoulder_R: [0.58, 0.22],
  elbow_L: [0.36, 0.38],
  elbow_R: [0.64, 0.38],
  wrist_L: [0.32, 0.53],
  wrist_R: [0.68, 0.53],
  hip_L: [0.45, 0.55],
  hip_R: [0.55, 0.55],
  knee_L: [0.44, 0.75],
  knee_R: [0.56, 0.75],
  ankle_L: [0.43, 0.94],
  ankle_R: [0.57, 0.94],
}

/** Fills any joint missing from `joints` with its template position, v=1 (manually asserted). */
export function withTemplateDefaults(joints: Joints): Record<JointName, Joint> {
  const filled = {} as Record<JointName, Joint>
  for (const name of CORE_JOINT_NAMES) {
    const existing = joints[name]
    if (existing !== undefined) {
      filled[name] = existing
    } else {
      const [x, y] = TEMPLATE_JOINTS[name]
      filled[name] = { x, y, v: 1 }
    }
  }
  return filled
}
