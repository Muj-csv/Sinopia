import { useState } from 'react'
import './App.css'
import { CaptureScreen } from './capture/CaptureScreen'
import { JointEditor } from './capture/JointEditor'
import { seedInitialJoints } from './capture/seedJoints'
import { detectJoints } from './pose/detect'
import type { Joints } from './pose/signature'
import type { CapturedImage } from './capture/types'
import { ResultsScreen } from './results/ResultsScreen'

type Step =
  | { name: 'capture' }
  | { name: 'detecting'; image: CapturedImage }
  | { name: 'editing'; image: CapturedImage; joints: Joints }
  | { name: 'results'; joints: Joints }

function App() {
  const [step, setStep] = useState<Step>({ name: 'capture' })

  async function handleCapture(image: CapturedImage) {
    setStep({ name: 'detecting', image })
    // FR-002: detect automatically; fall back to manual placement (ADR-005)
    // if detection fails or confidence is low -- either way the joint
    // editor opens next, pre-filled with whatever was detected and
    // defaults for the rest.
    const img = new Image()
    img.src = image.dataUrl
    await img.decode().catch(() => {})
    const { joints } = await detectJoints(img).catch(() => ({ joints: undefined }))
    setStep({ name: 'editing', image, joints: seedInitialJoints(joints) })
  }

  return (
    <main className="app">
      <h1>Sinopia</h1>

      {step.name === 'capture' && <CaptureScreen onCapture={handleCapture} />}

      {step.name === 'detecting' && <p className="detecting-status">Looking for a pose…</p>}

      {step.name === 'editing' && (
        <>
          <JointEditor
            image={step.image}
            initialJoints={step.joints}
            onChange={(joints) => setStep({ ...step, joints })}
          />
          <button type="button" onClick={() => setStep({ name: 'results', joints: step.joints })}>
            Continue
          </button>
        </>
      )}

      {step.name === 'results' && <ResultsScreen sketchJoints={step.joints} />}
    </main>
  )
}

export default App
