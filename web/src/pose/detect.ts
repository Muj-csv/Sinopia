/**
 * In-browser joint detection (ARCHITECTURE.md §2, FR-002). Runs the same
 * self-hosted MediaPipe Pose Landmarker `.task` model used by
 * ingest/ingest.py, WASM assets included, so nothing is fetched from a CDN
 * (NFR-001: sketches and detection never leave the device).
 *
 * Model + WASM files are gitignored (*.task) and must be present at
 * web/public/pose_landmarker.task and web/public/mediapipe-wasm/ -- copy
 * them from ingest/pose_landmarker.task and
 * node_modules/@mediapipe/tasks-vision/wasm/ respectively.
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Joints } from './signature'

const MODEL_PATH = '/pose_landmarker.task'
const WASM_BASE_PATH = '/mediapipe-wasm'

// Must match ingest/ingest.py's LANDMARK_INDEX exactly (ARCHITECTURE §3).
const LANDMARK_INDEX: Record<keyof Joints & string, number> = {
  nose: 0,
  shoulder_L: 11,
  shoulder_R: 12,
  elbow_L: 13,
  elbow_R: 14,
  wrist_L: 15,
  wrist_R: 16,
  hip_L: 23,
  hip_R: 24,
  knee_L: 25,
  knee_R: 26,
  ankle_L: 27,
  ankle_R: 28,
}

export const MIN_VISIBLE_CORE_JOINTS = 9
export const VISIBILITY_THRESHOLD = 0.3

let landmarkerPromise: Promise<PoseLandmarker> | undefined

function getLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH)
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH },
      runningMode: 'IMAGE',
      numPoses: 2, // >1 detected people => reject as multi-person, like ingest.py
    })
  })()
  return landmarkerPromise
}

export interface DetectionResult {
  /** undefined if detection failed, found 0 or >1 people (FR-002: fall back to manual placement). */
  joints: Joints | undefined
  visibleCoreJoints: number
}

export async function detectJoints(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<DetectionResult> {
  const landmarker = await getLandmarker()
  const result = landmarker.detect(image)

  if (result.landmarks.length !== 1) {
    return { joints: undefined, visibleCoreJoints: 0 }
  }

  const landmarks = result.landmarks[0]
  const joints: Joints = {}
  let visibleCount = 0
  for (const [name, idx] of Object.entries(LANDMARK_INDEX)) {
    const lm = landmarks[idx]
    if (!lm) continue
    const v = lm.visibility ?? 1
    joints[name as keyof Joints] = { x: lm.x, y: lm.y, v }
    if (v >= VISIBILITY_THRESHOLD) visibleCount += 1
  }

  if (visibleCount < MIN_VISIBLE_CORE_JOINTS) {
    return { joints: undefined, visibleCoreJoints: visibleCount }
  }
  return { joints, visibleCoreJoints: visibleCount }
}

/** Releases the WASM/model resources; call on unmount if detection won't be needed again. */
export async function disposeLandmarker(): Promise<void> {
  if (!landmarkerPromise) return
  const landmarker = await landmarkerPromise
  landmarker.close()
  landmarkerPromise = undefined
}
