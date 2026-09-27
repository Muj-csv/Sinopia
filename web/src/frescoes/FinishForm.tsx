/**
 * PHASE-3 task 2 (FR-006): '/new/finish'. Title/caption/memory/tags/place
 * name, limits mirroring the database, then saveFresco(). Gated by
 * AuthGate (task 1) -- sign-in returns here with the draft intact since
 * the draft lives in IndexedDB independent of auth state.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { deleteDraft, getDraft, type Draft } from '../lib/draftStore'
import { useSession } from '../lib/useSession'
import './fresco.css'
import {
  MAX_CAPTION,
  MAX_MEMORY,
  MAX_TAGS,
  MAX_TITLE,
  isValid,
  validateFinishFields,
  type FinishFields,
} from './fresco'
import { saveFresco } from './saveFresco'

function FinishFormInner({ draft, userId }: { draft: Draft; userId: string }) {
  const navigate = useNavigate()
  const [fields, setFields] = useState<FinishFields>({
    title: '',
    caption: '',
    memory: '',
    tags: [],
    placeName: draft.placeName ?? '',
  })
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<'editing' | 'submitting' | 'error'>('editing')
  const [error, setError] = useState<string | null>(null)

  const errors = validateFinishFields(fields)

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag === '' || fields.tags.includes(tag) || fields.tags.length >= MAX_TAGS) return
    setFields((f) => ({ ...f, tags: [...f.tags, tag] }))
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setFields((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }

  const submit = async () => {
    if (draft.exported === undefined || !isValid(errors)) return
    setStatus('submitting')
    setError(null)
    const result = await saveFresco({
      ownerId: userId,
      ...fields,
      photo: draft.photo,
      drawing: draft.exported.drawing,
      composite: draft.exported.composite,
      thumb: draft.thumb,
      width: draft.width,
      height: draft.height,
      capturedAt: draft.capturedAt,
      location: draft.location,
    })

    if (result.ok) {
      await deleteDraft(draft.id)
      navigate('/sketchbook')
    } else {
      // Upload failure keeps the local draft (never deleted here) so the user can retry.
      setStatus('error')
      setError(result.error ?? 'Saved as a draft on this device')
    }
  }

  return (
    <div className="finish-form">
      <h2>Finish your sinopia</h2>

      <label>
        Title
        <input
          type="text"
          maxLength={MAX_TITLE}
          value={fields.title}
          onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
        />
        {errors.title !== undefined && <span className="finish-form-error">{errors.title}</span>}
      </label>

      <label>
        Caption
        <textarea
          maxLength={MAX_CAPTION}
          value={fields.caption}
          onChange={(e) => setFields((f) => ({ ...f, caption: e.target.value }))}
        />
      </label>

      <label>
        What I remember
        <textarea
          maxLength={MAX_MEMORY}
          value={fields.memory}
          onChange={(e) => setFields((f) => ({ ...f, memory: e.target.value }))}
        />
      </label>

      <label>
        Place name
        <input
          type="text"
          value={fields.placeName}
          onChange={(e) => setFields((f) => ({ ...f, placeName: e.target.value }))}
        />
      </label>

      <div className="finish-form-tags">
        <label>
          Tags (up to {MAX_TAGS})
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
          />
        </label>
        <div className="finish-form-tag-list">
          {fields.tags.map((tag) => (
            <button key={tag} type="button" onClick={() => removeTag(tag)}>
              {tag} ×
            </button>
          ))}
        </div>
      </div>

      {status === 'error' && (
        <p className="finish-form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="finish-form-submit"
        disabled={!isValid(errors) || status === 'submitting'}
        onClick={submit}
      >
        {status === 'submitting' ? 'Saving...' : 'Save to Sketchbook'}
      </button>
    </div>
  )
}

export function FinishForm() {
  const [params] = useSearchParams()
  const draftId = params.get('draft')
  const [draft, setDraft] = useState<Draft | null>(null)
  const { session } = useSession()

  useEffect(() => {
    if (draftId === null) return
    getDraft(draftId).then((d) => setDraft(d ?? null))
  }, [draftId])

  if (draftId === null || draft === null) {
    return <p className="draw-status">Loading...</p>
  }
  if (draft.exported === undefined) {
    return <p className="draw-status">Draw at least one stroke and press Finish first.</p>
  }

  return (
    <AuthGate message="Sign in to save your sinopia to your Sketchbook.">
      {session !== null && <FinishFormInner draft={draft} userId={session.user.id} />}
    </AuthGate>
  )
}
