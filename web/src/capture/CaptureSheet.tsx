/**
 * PHASE-1 task 1: capture sheet ('/new'). Camera / Upload / Resume draft,
 * per docs/design/UX_MAP.md. On a successful capture: read EXIF, resolve
 * a location (EXIF -> device -> map picker later), prepare the image
 * (resize/WebP/strip EXIF), create the draft, and move on to '/new/pin'.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readExif } from '../lib/exif'
import { createDraft, listDrafts, type Draft } from '../lib/draftStore'
import { prepareImage } from '../lib/images'
import './capture.css'
import { getDevicePosition, resolveLocationSource } from './LocationFallback'
import { validateCaptureFile } from './validateCapture'

type Status = 'idle' | 'reading' | 'error'

export function CaptureSheet() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])

  useEffect(() => {
    listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]))
  }, [])

  const handleFile = async (file: File | undefined) => {
    if (file === undefined) return
    const reason = validateCaptureFile(file)
    if (reason !== null) {
      setError(reason)
      setStatus('error')
      return
    }

    setStatus('reading')
    setError(null)
    try {
      const [exif, devicePosition, prepared] = await Promise.all([
        readExif(file),
        // Only worth asking the device if the photo itself had no GPS -- but
        // we don't know that until readExif resolves, so ask in parallel and
        // resolveLocationSource() below decides which one actually gets used.
        getDevicePosition(),
        prepareImage(file),
      ])
      const resolved = resolveLocationSource(exif, devicePosition)

      const draft = await createDraft({
        photo: prepared.photo,
        thumb: prepared.thumb,
        width: prepared.width,
        height: prepared.height,
        capturedAt: exif.capturedAt,
        location:
          resolved.lat !== null && resolved.lng !== null
            ? { lat: resolved.lat, lng: resolved.lng }
            : null,
        placeName: null,
      })

      navigate(`/new/pin?draft=${draft.id}`)
    } catch {
      setError('Something went wrong reading that photo. Try a different file.')
      setStatus('error')
    }
  }

  return (
    <div className="capture-sheet">
      <h2>New sinopia</h2>
      <p className="capture-sheet-subtitle">Get a photo and its spot</p>

      <div className="capture-sheet-options">
        <label className="capture-option">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          Camera
        </label>
        <label className="capture-option">
          <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
          Upload
        </label>
      </div>

      {status === 'reading' && <p className="capture-status">Reading photo...</p>}
      {status === 'error' && error !== null && (
        <p className="capture-status capture-status-error" role="alert">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="capture-drafts">
          <h3>Resume draft</h3>
          <ul>
            {drafts.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => navigate(`/new/draw?draft=${d.id}`)}>
                  {d.placeName ?? 'Untitled spot'} · {new Date(d.updatedAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
