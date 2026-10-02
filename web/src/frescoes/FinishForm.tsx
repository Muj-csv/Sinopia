/**
 * PHASE-3 task 2 (FR-006): '/new/finish'. Title/caption/memory/tags/place
 * name, limits mirroring the database, then saveFresco(). Gated by
 * AuthGate (task 1) -- sign-in returns here with the draft intact since
 * the draft lives in IndexedDB independent of auth state.
 *
 * SCREENS.md "Finish": a lined page ending in a sticky bar with ONE yellow button whose label
 * follows the choice ("Keep in Sketchbook" / "Publish to Sinopia"). Keep and Publish are equal
 * choices, which is why they are a pair of choice cards and not two competing buttons.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { checkNewAchievements } from '../achievements/checkAchievements'
import { deleteDraft, getDraft, type Draft } from '../lib/draftStore'
import { useSession } from '../lib/useSession'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import { useToast } from '../ui/toastContext'
import './fresco.css'
import {
  MAX_CAPTION,
  MAX_MEMORY,
  MAX_TAGS,
  MAX_TITLE,
  isValid,
  snapToNeighborhoodGrid,
  validateFinishFields,
  type FinishFields,
  type PinPrecision,
  type Visibility,
} from './fresco'
import { finishFresco } from './finishFresco'

function FinishFormInner({ draft, userId }: { draft: Draft; userId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [fields, setFields] = useState<FinishFields>({
    title: '',
    caption: '',
    memory: '',
    tags: [],
    placeName: draft.placeName ?? '',
  })
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [precision, setPrecision] = useState<PinPrecision>('neighborhood')
  const [status, setStatus] = useState<'editing' | 'submitting' | 'error'>('editing')
  const [error, setError] = useState<string | null>(null)

  const errors = validateFinishFields(fields)

  const compositeUrl = useMemo(
    () => (draft.exported === undefined ? null : URL.createObjectURL(draft.exported.composite)),
    [draft],
  )
  useEffect(() => {
    return () => {
      if (compositeUrl !== null) URL.revokeObjectURL(compositeUrl)
    }
  }, [compositeUrl])

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

    const outcome = await finishFresco({
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
      referencesUsed: (draft.pinnedReferences ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        creator: r.creator,
        license: r.license,
        license_version: r.license_version,
        foreign_landing_url: r.foreign_landing_url,
      })),
      visibility,
      precision,
    })

    if (outcome.status === 'save-failed') {
      // Nothing was written, so the local draft stays for a retry.
      setStatus('error')
      setError(outcome.error)
      return
    }

    // The fresco exists either way from here, so the draft has done its job.
    await deleteDraft(draft.id)

    if (outcome.status === 'publish-failed') {
      setStatus('error')
      setError(`Saved to your Sketchbook, but publishing didn't go through: ${outcome.error}`)
      return
    }

    toast.show(
      outcome.status === 'published' ? 'Published to Sinopia' : 'Saved to your Sketchbook',
      outcome.status === 'published' ? 'globe' : 'book',
    )

    // Stats can only have moved just now, so this is the one moment worth a round trip to find
    // out what's newly unlocked; everywhere else just reads localMilestones.ts's flags directly.
    checkNewAchievements(userId).then((newlyUnlocked) => {
      for (const achievement of newlyUnlocked) {
        toast.show(`Achievement unlocked: ${achievement.name}`, 'trophy')
      }
    })

    navigate('/sketchbook')
  }

  const publicPoint =
    draft.location === null
      ? null
      : precision === 'exact'
        ? draft.location
        : snapToNeighborhoodGrid(draft.location.lat, draft.location.lng)

  return (
    <>
      <FlowBar title="Finish" exit="back" />

      <div className="scroll lined">
        <div className="page finish-form">
          {compositeUrl !== null && (
            <div className="finish-preview">
              <img src={compositeUrl} alt="Your fresco" className="finish-thumb" />
              <p className="t-small">
                Drawn over your photo
                {fields.placeName !== '' && ` at ${fields.placeName}`}
                {draft.capturedAt !== null &&
                  ` · ${new Date(draft.capturedAt).toLocaleDateString()}`}
              </p>
            </div>
          )}

          <label className="field">
            <span>Title</span>
            <input
              type="text"
              maxLength={MAX_TITLE}
              value={fields.title}
              onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
            />
            <span className="count t-num">
              {fields.title.length}/{MAX_TITLE}
            </span>
            {errors.title !== undefined && <span className="error">{errors.title}</span>}
          </label>

          <label className="field">
            <span>Place</span>
            <input
              type="text"
              value={fields.placeName}
              onChange={(e) => setFields((f) => ({ ...f, placeName: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>Caption</span>
            <textarea
              maxLength={MAX_CAPTION}
              value={fields.caption}
              onChange={(e) => setFields((f) => ({ ...f, caption: e.target.value }))}
            />
            <span className="count t-num">
              {fields.caption.length}/{MAX_CAPTION}
            </span>
          </label>

          <label className="field">
            <span>What I remember</span>
            {/* The one detail only Sinopia has: this field's line-height matches the notebook
                pitch, so what you type sits ON the lines like writing in a diary. */}
            <textarea
              className="memory-field"
              maxLength={MAX_MEMORY}
              value={fields.memory}
              onChange={(e) => setFields((f) => ({ ...f, memory: e.target.value }))}
            />
            <span className="count t-num">
              {fields.memory.length}/{MAX_MEMORY}
            </span>
          </label>

          <div className="field">
            <label htmlFor="finish-tag-input">Tags (up to {MAX_TAGS})</label>
            <input
              id="finish-tag-input"
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
            {fields.tags.length > 0 && (
              <div className="finish-tags">
                {fields.tags.map((tag) => (
                  <button key={tag} type="button" className="chip" onClick={() => removeTag(tag)}>
                    {tag}
                    <Icon name="x" label={`Remove ${tag}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <fieldset className="finish-choices">
            <legend>Who can see it?</legend>
            <label className="choice">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              <span className="title">Only me</span>
              <span className="desc">It stays in your Sketchbook.</span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              <span className="title">Everyone</span>
              <span className="desc">It appears on Sinopia for anyone to find.</span>
            </label>
          </fieldset>

          {visibility === 'public' && (
            <fieldset className="finish-choices">
              <legend>How exact is the pin?</legend>
              <label className="choice">
                <input
                  type="radio"
                  name="precision"
                  checked={precision === 'neighborhood'}
                  onChange={() => setPrecision('neighborhood')}
                />
                <span className="title">Neighbourhood</span>
                <span className="desc">
                  The pin lands within about half a kilometre. Nobody sees where you stood.
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="precision"
                  checked={precision === 'exact'}
                  onChange={() => setPrecision('exact')}
                />
                <span className="title">Exact spot</span>
                <span className="desc">The pin lands where the photo was taken.</span>
              </label>

              {precision === 'exact' && (
                <p className="notice">
                  <Icon name="warn" />
                  <span>
                    Anyone will be able to see exactly where you were standing. Choose neighbourhood
                    if that&apos;s a place you&apos;d rather keep to yourself.
                  </span>
                </p>
              )}

              {publicPoint !== null && (
                <p className="t-small t-num">
                  Sinopia will show {publicPoint.lat.toFixed(4)}, {publicPoint.lng.toFixed(4)}.
                </p>
              )}
            </fieldset>
          )}

          {status === 'error' && (
            <p className="notice danger" role="alert">
              <Icon name="warn" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>

      {/* One yellow button, and its label follows the choice above. */}
      <div className="finish-actions">
        <button
          type="button"
          className="btn-y btn-wide"
          disabled={!isValid(errors) || status === 'submitting'}
          onClick={submit}
        >
          {status === 'submitting'
            ? 'Saving…'
            : visibility === 'public'
              ? 'Publish to Sinopia'
              : 'Keep in Sketchbook'}
        </button>
      </div>
    </>
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
    return (
      <>
        <FlowBar title="Finish" exit="back" />
        <p className="page t-small">Loading&hellip;</p>
      </>
    )
  }
  if (draft.exported === undefined) {
    return (
      <>
        <FlowBar title="Finish" exit="back" />
        <p className="page t-small">Draw at least one stroke and press Finish first.</p>
      </>
    )
  }

  return (
    <AuthGate message="Sign in to save your underdrawing to your Sketchbook.">
      {session !== null && <FinishFormInner draft={draft} userId={session.user.id} />}
    </AuthGate>
  )
}
