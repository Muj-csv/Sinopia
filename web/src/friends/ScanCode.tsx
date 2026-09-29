/**
 * Optional in-app QR scanning, on top of the primary path (any phone's own camera app already
 * opens `/friend/<code>` from the QR -- see qr.ts). This is a shortcut for browsers that support
 * the Shape Detection API; everywhere else it just says so and points at the camera app instead,
 * rather than shipping a JS QR-decoding library for a feature most phones already have built in.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'

const CODE_IN_LINK = /\/friend\/([A-Za-z0-9]+)/

export function ScanCode({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const supported = typeof window !== 'undefined' && window.BarcodeDetector !== undefined

  useEffect(() => {
    if (!supported) return
    let stream: MediaStream | null = null
    let frame = 0
    let stopped = false
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] })

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const video = videoRef.current
        if (video !== null) {
          video.srcObject = s
          void video.play()
        }

        const tick = async () => {
          if (stopped || videoRef.current === null) return
          try {
            const found = await detector.detect(videoRef.current)
            const raw = found[0]?.rawValue
            if (typeof raw === 'string') {
              const match = raw.match(CODE_IN_LINK)
              const code = (match?.[1] ?? raw).toUpperCase()
              stopped = true
              navigate(`/friend/${code}`)
              return
            }
          } catch {
            // A frame that didn't decode isn't an error -- keep watching.
          }
          frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      })
      .catch(() => setError('Camera access was not allowed.'))

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [supported, navigate])

  if (!supported) {
    return (
      <div className="scan-view">
        <p className="notice">
          <Icon name="info" />
          <span>
            In-app scanning isn&apos;t available in this browser. Point your phone&apos;s own
            camera app at the code instead -- it opens Sinopia straight to the add-neighbor screen.
          </span>
        </p>
        <button type="button" className="btn-o" onClick={onClose}>
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="scan-view">
      <video ref={videoRef} className="scan-video" muted playsInline aria-label="Point the camera at a Sinopia code" />
      {error !== null && (
        <p className="notice danger" role="alert">
          <Icon name="warn" />
          <span>{error}</span>
        </p>
      )}
      <button type="button" className="btn-o" onClick={onClose}>
        Cancel
      </button>
    </div>
  )
}
