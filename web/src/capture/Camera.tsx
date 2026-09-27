/** FR-001: take a camera photo. NFR-001: the stream never leaves the device. */
import { useEffect, useRef, useState } from 'react'

export function Camera({ onImage }: { onImage: (blob: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let stream: MediaStream | undefined
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => setError('Camera access was denied or is unavailable.'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active])

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob !== null) onImage(blob)
    }, 'image/png')
  }

  if (!active) {
    return (
      <button type="button" className="capture-camera-start" onClick={() => setActive(true)}>
        Use camera
      </button>
    )
  }

  return (
    <div className="capture-camera">
      <video ref={videoRef} autoPlay playsInline muted />
      {error !== null && (
        <p className="capture-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={capture} disabled={error !== null}>
        Take photo
      </button>
    </div>
  )
}
