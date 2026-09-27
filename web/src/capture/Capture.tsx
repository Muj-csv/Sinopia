/**
 * Phase 3 tasks 1-2 (docs/build/PHASE-3.md): capture entry point plus the
 * joint editor. Lets the user upload, photograph, or draw a sketch, runs
 * detection in the browser (NFR-001: the image never leaves the device),
 * then always opens the joint editor -- either to correct a detected pose
 * or, on failed detection, as the fully-manual placement path (ADR-005).
 *
 * D-002 (docs/DECISIONS.md) is still Open/blocked -- Phase 0 never got
 * real sketches, so the default capture path was never decided from data.
 * This defaults to auto-detect first (PRD §6 journey 1, the happy path),
 * falling back to the exact "Couldn't find a figure" copy from journey 2
 * on failure. Revisit if Phase 0 is ever re-run.
 */
import { useState } from 'react'
import type { Joints } from '../pose/signature'
import { Camera } from './Camera'
import { Canvas } from './Canvas'
import './Capture.css'
import { imageSourceToRawImageData, rawImageDataToCanvas } from './canvasUtils'
import { detectPose, isUsableDetection } from './detect'
import { JointEditor } from './JointEditor'
import { preprocessForDetection } from './preprocess'
import { Upload } from './Upload'
import { ResultsScreen } from '../results'

type Mode = 'upload' | 'camera' | 'draw'
type Status = 'idle' | 'loading' | 'editing' | 'confirmed' | 'error'

export interface CaptureResult {
  imageUrl: string
  joints: Joints
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'camera', label: 'Camera' },
  { id: 'draw', label: 'Draw' },
]

export function Capture({ onCapture }: { onCapture?: (result: CaptureResult) => void }) {
  const [mode, setMode] = useState<Mode>('upload')
  const [status, setStatus] = useState<Status>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [detectedJoints, setDetectedJoints] = useState<Joints>({})
  const [detectionOk, setDetectionOk] = useState(false)
  const [finalJoints, setFinalJoints] = useState<Joints>({})

  const runDetection = async (image: Blob) => {
    setStatus('loading')
    const url = URL.createObjectURL(image)
    try {
      const bitmap = await createImageBitmap(image)
      const raw = imageSourceToRawImageData(bitmap, bitmap.width, bitmap.height)
      const processed = preprocessForDetection(raw)
      const canvas = rawImageDataToCanvas(processed)
      const result = await detectPose(canvas)

      const ok = isUsableDetection(result.personCount, result.visibleCount)
      setImageUrl(url)
      setDetectedJoints(ok ? result.joints : {})
      setDetectionOk(ok)
      setStatus('editing')
    } catch {
      setImageUrl(url)
      setStatus('error')
    }
  }

  const confirmJoints = (joints: Joints) => {
    setFinalJoints(joints)
    setStatus('confirmed')
    if (imageUrl !== null) onCapture?.({ imageUrl, joints })
  }

  return (
    <div className="capture">
      {(status === 'idle' || status === 'loading' || status === 'error') && (
        <>
          <div className="capture-modes" role="tablist">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={mode === m.id ? 'active' : ''}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="capture-input">
            {mode === 'upload' && <Upload onImage={runDetection} />}
            {mode === 'camera' && <Camera onImage={runDetection} />}
            {mode === 'draw' && <Canvas onImage={runDetection} />}
          </div>
        </>
      )}

      {status === 'loading' && <p className="capture-status">Reading pose geometry...</p>}

      {status === 'error' && (
        <p className="capture-error" role="alert">
          Something went wrong reading that image. Try a different file.
        </p>
      )}

      {status === 'editing' && imageUrl !== null && (
        <div className="capture-editing">
          <p className="capture-status" role={detectionOk ? undefined : 'alert'}>
            {detectionOk
              ? 'Pose detected. Adjust any joint, then confirm.'
              : "Couldn't find a figure. Place the joints on your sketch."}
          </p>
          <JointEditor imageUrl={imageUrl} initialJoints={detectedJoints} onConfirm={confirmJoints} />
        </div>
      )}

      {status === 'confirmed' && <ResultsScreen queryJoints={finalJoints} />}
    </div>
  )
}
