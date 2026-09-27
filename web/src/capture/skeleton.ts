import type { JointName } from '../pose/signature'

/** Bone connections for overlay rendering, matching spike/detect.py's SKELETON_EDGES. */
export const SKELETON_EDGES: [JointName, JointName][] = [
  ['shoulder_L', 'shoulder_R'],
  ['shoulder_L', 'elbow_L'],
  ['elbow_L', 'wrist_L'],
  ['shoulder_R', 'elbow_R'],
  ['elbow_R', 'wrist_R'],
  ['hip_L', 'hip_R'],
  ['shoulder_L', 'hip_L'],
  ['shoulder_R', 'hip_R'],
  ['hip_L', 'knee_L'],
  ['knee_L', 'ankle_L'],
  ['hip_R', 'knee_R'],
  ['knee_R', 'ankle_R'],
]
