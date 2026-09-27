/**
 * Browser-side pose detection (ARCHITECTURE.md capture component). Mirrors
 * ingest/ingest.py's detect_joints(): same landmark indices, same
 * MIN_VISIBLE_CORE_JOINTS threshold, same single-person requirement, same
 * .task model file (CLAUDE.md: "self-hosted, same model file in ingest
 * and browser").
 *
 * The pure mapping/threshold logic below is unit-tested. Model loading and
 * actual detection need a real WASM runtime + <canvas>/<video> element and
 * are browser-only (verified manually, not under vitest/jsdom).
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { CORE_JOINT_NAMES, VISIBILITY_THRESHOLD, type JointName, type Joints } from '../pose/signature'

// Keep in sync with the installed @mediapipe/tasks-vision version in package.json.
const TASKS_VISION_VERSION = '1.0.1'
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
// import.meta.env.BASE_URL respects vite.config.ts's `base` (root locally, /Sinopia/ on GitHub Pages).
const MODEL_URL = `${import.meta.env.BASE_URL}models/pose_landmarker.task`

// MediaPipe's 33-point pose model, indices for the 13 core joints
// (ingest/ingest.py's LANDMARK_INDEX). Order matches signature.CORE_JOINT_NAMES.
const LANDMARK_INDEX: Record<JointName, number> = {
  nose: 0,
  shoulder_L: 11, shoulder_R: 12,
  elbow_L: 13, elbow_R: 14,
  wrist_L: 15, wrist_R: 16,
  hip_L: 23, hip_R: 24,
  knee_L: 25, knee_R: 26,
  ankle_L: 27, ankle_R: 28,
}

export const MIN_VISIBLE_CORE_JOINTS = 9

export interface RawLandmark {
  x: number
  y: number
  visibility?: number
}

export interface DetectionResult {
  joints: Joints
  visibleCount: number
  personCount: number
}

export function landmarksToJoints(landmarks: readonly RawLandmark[]): Joints {
  const joints: Joints = {}
  for (const name of CORE_JOINT_NAMES) {
    const lm = landmarks[LANDMARK_INDEX[name]]
    if (lm !== undefined) joints[name] = { x: lm.x, y: lm.y, v: lm.visibility ?? 1 }
  }
  return joints
}

export function countVisible(joints: Joints): number {
  return CORE_JOINT_NAMES.filter((name) => (joints[name]?.v ?? 0) >= VISIBILITY_THRESHOLD).length
}

/** Same acceptance rule as ingest.py: exactly one person, enough visible joints. */
export function isUsableDetection(personCount: number, visibleCount: number): boolean {
  return personCount === 1 && visibleCount >= MIN_VISIBLE_CORE_JOINTS
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null

function getLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'IMAGE',
      numPoses: 2, // >1 detected => reject as multi-person, same as ingest.py
    }),
  )
  return landmarkerPromise
}

export async function detectPose(
  image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): Promise<DetectionResult> {
  const landmarker = await getLandmarker()
  const result = landmarker.detect(image)
  const personCount = result.landmarks.length
  if (personCount !== 1) return { joints: {}, visibleCount: 0, personCount }

  const joints = landmarksToJoints(result.landmarks[0])
  return { joints, visibleCount: countVisible(joints), personCount }
}
