import { useEffect, useRef, useState } from 'react'
import { type CapturedImage, loadImage } from './types'

interface Props {
  onCapture: (image: CapturedImage) => void
}

export function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const [error, setError] = useState<string | undefined>()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop()
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setReady(true)
      })
      .catch(() => setError('Could not access the camera. Check permissions and try again.'))

    return () => {
      cancelled = true
      for (const track of streamRef.current?.getTracks() ?? []) track.stop()
    }
  }, [])

  function handleCapture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    loadImage(canvas.toDataURL('image/png')).then(onCapture)
  }

  if (error !== undefined) {
    return (
      <p role="alert" className="capture-error">
        {error}
      </p>
    )
  }

  return (
    <div className="capture-panel">
      <video ref={videoRef} autoPlay playsInline muted className="capture-video" />
      <button type="button" onClick={handleCapture} disabled={!ready}>
        Take photo
      </button>
    </div>
  )
}
