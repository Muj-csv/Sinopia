import { useState } from 'react'
import { CameraCapture } from './CameraCapture'
import { DrawCanvas } from './DrawCanvas'
import { ImageUpload } from './ImageUpload'
import type { CaptureMethod, CapturedImage } from './types'

interface Props {
  onCapture: (image: CapturedImage) => void
}

const METHODS: { key: CaptureMethod; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'camera', label: 'Camera' },
  { key: 'draw', label: 'Draw' },
]

export function CaptureScreen({ onCapture }: Props) {
  const [method, setMethod] = useState<CaptureMethod>('upload')

  return (
    <section aria-label="Capture a sketch">
      <div role="tablist" aria-label="Capture method" className="capture-tabs">
        {METHODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={method === key}
            className={method === key ? 'active' : undefined}
            onClick={() => setMethod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {method === 'upload' && <ImageUpload onCapture={onCapture} />}
      {method === 'camera' && <CameraCapture onCapture={onCapture} />}
      {method === 'draw' && <DrawCanvas onCapture={onCapture} />}
    </section>
  )
}
