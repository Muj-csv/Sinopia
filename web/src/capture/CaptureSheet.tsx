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
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ResponseSourceCard } from '../frescoes/ResponseSourceCard'
import { loadDrawSource, type DrawSource } from '../frescoes/responses'
import { hasGps, readExif } from '../lib/exif'
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
  const [params] = useSearchParams()
  const missionId = params.get('mission')
  const collabId = params.get('collab')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [contextLabel, setContextLabel] = useState<string | null>(null)
  // Draw This Wall: '/new?from=<fresco id>' starts a response to that fresco.
  const fromId = params.get('from')
  const [source, setSource] = useState<DrawSource | null>(null)
  const [sourceStatus, setSourceStatus] = useState<'none' | 'loading' | 'ready' | 'unavailable'>(
    fromId === null ? 'none' : 'loading',
  )

  useEffect(() => {
    listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]))
  }, [])

  // UX-03: keep the artist aware of what they're drawing toward, from the first screen of the flow.
  useEffect(() => {
    if (missionId !== null) {
      import('../missions/missions').then(({ fetchMission }) =>
        fetchMission(missionId).then((m) =>
          setContextLabel(m !== null ? `Mission: ${m.title}` : null),
        ),
      )
    } else if (collabId !== null) {
      import('../collab/collaborativeFrescos').then(({ fetchCollaborativeFresco }) =>
        fetchCollaborativeFresco(collabId).then((cf) =>
          setContextLabel(cf !== null ? `Adding a layer to: ${cf.title}` : null),
        ),
      )
    }
  }, [missionId, collabId])
  useEffect(() => {
    if (fromId === null) return
    let cancelled = false
    loadDrawSource(fromId).then((loaded) => {
      if (cancelled) return
      setSource(loaded)
      setSourceStatus(loaded === null ? 'unavailable' : 'ready')
    })
    return () => {
      cancelled = true
    }
  }, [fromId])

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
      const [exif, prepared] = await Promise.all([readExif(file), prepareImage(file)])

      // Only ask the device once we know the photo has no GPS of its own. Asking in parallel was
      // faster, but it raised the browser's location prompt on every capture, including the
      // photos that already carried a position -- a permission request nobody needed to answer.
      // Pin check can still place it by hand, and offers "Use my location" on demand.
      // A response without photo GPS starts at the source's public pin instead, so no prompt then.
      const sourcePoint = source?.point ?? null
      const devicePosition = hasGps(exif) || sourcePoint !== null ? null : await getDevicePosition()
      const resolved = resolveLocationSource(exif, devicePosition, sourcePoint)

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
        missionId: missionId ?? undefined,
        collaborativeFrescoId: collabId ?? undefined,
        placeName: resolved.source === 'source' ? (source?.placeName ?? null) : null,
        source: source ?? undefined,
      })

      navigate(`/new/pin?draft=${draft.id}`)
    } catch {
      setError('Something went wrong reading that photo. Try a different file.')
      setStatus('error')
    }
  }

  return (
    <>
      <FlowBar title="New underdrawing" />
      <div className="scroll lined">
        <div className="page capture-sheet">
          {contextLabel !== null && (
            <p className="notice" role="status">
              <Icon name={missionId !== null ? 'target' : 'layers'} />
              <span>{contextLabel}</span>
            </p>
          )}
          <div>
            <h2 className="capture-heading">Start with a real place</h2>
            <p className="capture-subtitle">A photo of where you are, and where it was taken.</p>
          </div>

          {source !== null && (
            <ResponseSourceCard
              source={source}
              hint="Take your own photo of this place. Their fresco stays exactly as it is."
            />
          )}
          {sourceStatus === 'unavailable' && (
            <p className="notice" role="status">
              <Icon name="info" />
              <span>
                That fresco isn&apos;t public any more, so this will be an ordinary underdrawing.
              </span>
            </p>
          )}

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
                disabled={sourceStatus === 'loading'}
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
                disabled={sourceStatus === 'loading'}
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
                  <span className="option-title">Resume your underdrawing</span>
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
