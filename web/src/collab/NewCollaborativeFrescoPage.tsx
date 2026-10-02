/**
 * '/collab/new' (CF-FR-01): title, optional place and description, and the two settings CF-FR-11
 * calls out explicitly -- visibility and invite-only -- both defaulting to the MVP-recommended
 * private/invite-only. The organizer's own first layer is added afterwards, from the fresco it
 * opens on (same drawing flow as everything else).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
// Reuses the Finish form's generic "choice cards + pinned yellow action bar" pattern
// (.finish-choices/.choice/.finish-actions) rather than duplicating it.
import '../frescoes/fresco.css'
import { useSession } from '../lib/useSession'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import './collab.css'
import { createCollaborativeFresco } from './collaborativeFrescos'

function NewCollaborativeFrescoForm({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [placeName, setPlaceName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [inviteOnly, setInviteOnly] = useState(true)
  const [status, setStatus] = useState<'editing' | 'submitting' | 'error'>('editing')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (title.trim() === '') return
    setStatus('submitting')
    setError(null)
    const result = await createCollaborativeFresco({
      ownerId: userId,
      title,
      description,
      placeName,
      missionId: null,
      visibility,
      inviteOnly,
    })
    if (!result.ok) {
      setStatus('error')
      setError(result.error)
      return
    }
    navigate(`/collab/${result.id}`)
  }

  return (
    <>
      <FlowBar title="New collaborative fresco" exit="back" />
      <div className="scroll lined">
        <div className="page collab-form">
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Heritage Street"
            />
          </label>

          <label className="field">
            <span>Place (optional)</span>
            <input
              type="text"
              maxLength={200}
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Where is everyone drawing?"
            />
          </label>

          <label className="field">
            <span>Description (optional)</span>
            <textarea
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <fieldset className="finish-choices">
            <legend>Who can contribute?</legend>
            <label className="choice">
              <input
                type="radio"
                name="invite-only"
                checked={inviteOnly}
                onChange={() => setInviteOnly(true)}
              />
              <span className="title">Invite only</span>
              <span className="desc">You choose who can add a layer.</span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="invite-only"
                checked={!inviteOnly}
                onChange={() => setInviteOnly(false)}
              />
              <span className="title">Open</span>
              <span className="desc">Anyone signed in can add a layer.</span>
            </label>
          </fieldset>

          <fieldset className="finish-choices">
            <legend>Who can see it?</legend>
            <label className="choice">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              <span className="title">Only invited artists</span>
              <span className="desc">You can publish it later.</span>
            </label>
            <label className="choice">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              <span className="title">Everyone</span>
              <span className="desc">Shows on the globe and in Missions galleries.</span>
            </label>
          </fieldset>

          {status === 'error' && (
            <p className="notice danger" role="alert">
              <Icon name="warn" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>

      <div className="finish-actions">
        <button
          type="button"
          className="btn-y btn-wide"
          disabled={title.trim() === '' || status === 'submitting'}
          onClick={submit}
        >
          {status === 'submitting' ? 'Creating…' : 'Create'}
        </button>
      </div>
    </>
  )
}

export function NewCollaborativeFrescoPage() {
  const { session, loading } = useSession()
  if (loading) return <p className="page t-small">Loading&hellip;</p>

  return (
    <AuthGate message="Sign in to start a collaborative fresco.">
      {session !== null && <NewCollaborativeFrescoForm userId={session.user.id} />}
    </AuthGate>
  )
}
