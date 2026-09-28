/**
 * PHASE-1 task 1: capture sheet ('/new'). Camera / Upload / Resume draft,
 * per docs/design/UX_MAP.md. On a successful capture: read EXIF, resolve
 * a location (EXIF -> device -> map picker later), prepare the image
 * (resize/WebP/strip EXIF), create the draft, and move on to '/new/pin'.
 *
 * Layout per SCREENS.md "Capture · /new": a lined page with stacked option cards, status below.
 * Not a dashed drop zone -- on a phone that is a desktop idiom with nothing to drop.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readExif } from '../lib/exif'
import { createDraft, listDrafts, type Draft } from '../lib/draftStore'
import { prepareImage } from '../lib/images'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
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
        locationSource: resolved.source,
        placeName: null,
      })

      navigate(`/new/pin?draft=${draft.id}`)
    } catch {
      setError('Something went wrong reading that photo. Try a different file.')
      setStatus('error')
    }
  }

  return (
    <>
      <FlowBar title="New sinopia" />
      <div className="scroll lined">
        <div className="page capture-sheet">
          <div>
            <h2 className="capture-heading">Start with a real place</h2>
            <p className="capture-subtitle">A photo of where you are, and where it was taken.</p>
          </div>

          <div className="options">
            {/* Take a photo is the primary action, so it leads. Both are paper: a file input can't
                be a .btn-y, and this screen's yellow belongs to Confirm spot on the next step. */}
            <label className="option">
              <Icon name="camera" />
              <span className="option-text">
                <span className="option-title">Take a photo</span>
                <span className="option-meta">Opens your camera.</span>
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>

            <label className="option">
              <Icon name="upload" />
              <span className="option-text">
                <span className="option-title">Upload a photo</span>
                <span className="option-meta">One you already took.</span>
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>

            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                className="option"
                onClick={() => navigate(`/new/draw?draft=${draft.id}`)}
              >
                <Icon name="edit" />
                <span className="option-text">
                  <span className="option-title">Resume your sinopia</span>
                  <span className="option-meta">
                    {draft.placeName ?? 'Untitled spot'} ·{' '}
                    {new Date(draft.updatedAt).toLocaleString()}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {status === 'reading' && (
            <p className="capture-status">
              <span className="spinner" aria-hidden="true" />
              Reading photo&hellip;
            </p>
          )}
          {status === 'error' && error !== null && (
            <p className="notice danger" role="alert">
              <Icon name="warn" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>
    </>
  )
}
