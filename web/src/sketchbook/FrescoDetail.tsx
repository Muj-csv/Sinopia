/** PHASE-3 task 5: detail view -- edit, publish/unpublish, delete. */
import { useEffect, useState } from 'react'
import { deleteFresco } from '../frescoes/deleteFresco'
import {
  MAX_CAPTION,
  MAX_MEMORY,
  MAX_TAGS,
  MAX_TITLE,
  isValid,
  validateFinishFields,
} from '../frescoes/fresco'
import { publishFresco, unpublishFresco } from '../frescoes/publishFresco'
import { supabase } from '../lib/supabase'
import { checkImageSafety } from '../safety/nsfwCheck'
import { Icon } from '../ui/Icon'
import { frescoImageUrl } from './frescoImageUrl'
import type { FrescoRow } from './frescoRow'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image failed to load'))
    img.src = url
  })
}

export function FrescoDetail({
  fresco,
  onClose,
  onChanged,
}: {
  fresco: FrescoRow
  onClose: () => void
  onChanged: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [title, setTitle] = useState(fresco.title)
  const [caption, setCaption] = useState(fresco.caption ?? '')
  const [memory, setMemory] = useState(fresco.memory ?? '')
  const [placeName, setPlaceName] = useState(fresco.place_name ?? '')
  const [precision, setPrecision] = useState<'exact' | 'neighborhood'>('neighborhood')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    frescoImageUrl(fresco.visibility, fresco.composite_path).then(setImageUrl)
  }, [fresco])

  const fields = { title, caption, memory, tags: fresco.tags, placeName }
  const errors = validateFinishFields(fields)

  const saveEdits = async () => {
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('frescoes')
      .update({
        title: title.trim(),
        caption: caption || null,
        memory: memory || null,
        place_name: placeName || null,
      })
      .eq('id', fresco.id)
    setBusy(false)
    if (updateError) setError("Couldn't save your changes.")
    else onChanged()
  }

  const publish = async () => {
    setBusy(true)
    setError(null)

    // PHASE-5a task 2 (FR-016): in-browser safety check before publishing.
    // imageUrl is the composite; if it hasn't loaded yet for some reason,
    // skip the check rather than block indefinitely -- fail open, same as
    // checkImageSafety's own model-load failure handling.
    if (imageUrl !== null) {
      try {
        const img = await loadImage(imageUrl)
        const safety = await checkImageSafety(img)
        if (safety.flagged) {
          setBusy(false)
          setError(safety.reason ?? 'This image was flagged. Publishing is blocked.')
          return
        }
      } catch {
        // Image failed to load for the check -- proceed; publishFresco
        // will surface any real upload problem on its own.
      }
    }

    const result = await publishFresco({ ownerId: fresco.owner_id, frescoId: fresco.id }, precision)
    setBusy(false)
    if (result.ok) onChanged()
    else setError(result.error ?? "Publishing didn't finish.")
  }

  const unpublish = async () => {
    setBusy(true)
    setError(null)
    const result = await unpublishFresco({ ownerId: fresco.owner_id, frescoId: fresco.id })
    setBusy(false)
    if (result.ok) onChanged()
    else setError(result.error ?? "Couldn't unpublish.")
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${fresco.title}"? This can't be undone.`)) return
    setBusy(true)
    setError(null)
    const result = await deleteFresco(fresco.owner_id, fresco.id, fresco.visibility === 'public')
    setBusy(false)
    if (result.ok) {
      onChanged()
      onClose()
    } else {
      setError(result.error ?? "Couldn't delete.")
    }
  }

  return (
    <div className="fresco-detail-backdrop" onClick={onClose}>
      <div className="fresco-detail" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{fresco.title}</h2>
          <button type="button" className="ibtn" onClick={onClose}>
            <Icon name="x" label="Close" />
          </button>
        </div>

        {imageUrl !== null && (
          <img src={imageUrl} alt={fresco.title} className="fresco-detail-image" />
        )}

        <label>
          Title
          <input maxLength={MAX_TITLE} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Caption
          <textarea
            maxLength={MAX_CAPTION}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <label>
          What I remember
          <textarea
            maxLength={MAX_MEMORY}
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
          />
        </label>
        <label>
          Place name
          <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
        </label>
        <p className="t-small">Tags (up to {MAX_TAGS}) are set when the fresco is made.</p>

        {/* This sheet's one yellow button. Publish/Unpublish and Delete stay paper. */}
        <button
          type="button"
          className="btn-y btn-wide"
          disabled={busy || !isValid(errors)}
          onClick={saveEdits}
        >
          Save changes
        </button>

        <div className="publish-panel">
          {fresco.visibility === 'private' ? (
            <>
              <h3>How exact is the pin?</h3>
              <div className="publish-panel-precision">
                <label className="choice">
                  <input
                    type="radio"
                    name="detail-precision"
                    checked={precision === 'neighborhood'}
                    onChange={() => setPrecision('neighborhood')}
                  />
                  <span className="title">Neighbourhood</span>
                </label>
                <label className="choice">
                  <input
                    type="radio"
                    name="detail-precision"
                    checked={precision === 'exact'}
                    onChange={() => setPrecision('exact')}
                  />
                  <span className="title">Exact spot</span>
                </label>
              </div>
              {precision === 'exact' && (
                <p className="notice">
                  <Icon name="warn" />
                  <span>This shows exactly where you took the photo, publicly.</span>
                </p>
              )}
              <button type="button" className="btn-o" disabled={busy} onClick={publish}>
                Publish to Globe
              </button>
            </>
          ) : (
            <button type="button" className="btn-o" disabled={busy} onClick={unpublish}>
              Unpublish
            </button>
          )}
        </div>

        <button type="button" className="btn-o danger" disabled={busy} onClick={remove}>
          <Icon name="trash" />
          Delete this fresco
        </button>

        {error !== null && (
          <p className="notice danger" role="alert">
            <Icon name="warn" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  )
}
