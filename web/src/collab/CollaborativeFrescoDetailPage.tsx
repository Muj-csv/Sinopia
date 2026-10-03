/**
 * '/collab/:id': the composite view (a mosaic of every layer -- each contribution is a full,
 * independently owned fresco rather than a transparent layer over one shared photo, so true pixel
 * compositing doesn't apply the way it would for layers on a single canvas; CF-FR-09's "individual
 * layer" mode is just that contribution's own fresco viewer), the contributor list, inviting people
 * (owner only), adding your own layer, and closing it (owner only, CF-FR-14).
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { loadFriendsData } from '../friends/friends'
import { useSession } from '../lib/useSession'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import './collab.css'
import {
  closeCollaborativeFresco,
  fetchCollaborativeFresco,
  fetchContributions,
  fetchInvitations,
  inviteCollaborator,
  type CollaborativeFresco,
  type Contribution,
  type Invitation,
} from './collaborativeFrescos'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

function InvitePanel({
  collaborativeFrescoId,
  userId,
  invitations,
  onInvited,
}: {
  collaborativeFrescoId: string
  userId: string
  invitations: Invitation[]
  onInvited: () => void
}) {
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([])
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadFriendsData(userId).then((data) => {
      if (cancelled) return
      const invitedIds = new Set(invitations.map((i) => i.inviteeId))
      setCandidates(
        data.neighbors
          .filter((n) => !invitedIds.has(n.other.id))
          .map((n) => ({ id: n.other.id, name: n.other.name })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [userId, invitations])

  const invite = async (inviteeId: string) => {
    setInviting(inviteeId)
    await inviteCollaborator(collaborativeFrescoId, userId, inviteeId)
    setInviting(null)
    onInvited()
  }

  return (
    <section className="collab-invite">
      <h2>Invite</h2>
      {invitations.length > 0 && (
        <ul className="collab-invited-list">
          {invitations.map((i) => (
            <li key={i.id}>{i.inviteeName}</li>
          ))}
        </ul>
      )}
      {candidates.length === 0 ? (
        <p className="t-small">
          No more Sinopia Neighbors to invite. Add some from{' '}
          <Link className="link" to="/friends">
            Friends
          </Link>
          .
        </p>
      ) : (
        <ul className="collab-invited-list">
          {candidates.map((c) => (
            <li key={c.id}>
              <span>{c.name}</span>
              <button
                type="button"
                className="btn-o"
                disabled={inviting === c.id}
                onClick={() => invite(c.id)}
              >
                Invite
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function CollaborativeFrescoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useSession()
  const [status, setStatus] = useState<Status>('loading')
  const [cf, setCf] = useState<CollaborativeFresco | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [closing, setClosing] = useState(false)

  const load = useCallback(async () => {
    if (id === undefined) return
    const found = await fetchCollaborativeFresco(id)
    if (found === null) {
      setStatus('not-found')
      return
    }
    setCf(found)
    const [layers, invites] = await Promise.all([
      fetchContributions(id),
      found.ownerId === session?.user.id ? fetchInvitations(id) : Promise.resolve([]),
    ])
    setContributions(layers)
    setInvitations(invites)
    setStatus('ready')
  }, [id, session])

  useEffect(() => {
    // Deferred a tick so the effect body itself doesn't call setState synchronously.
    void Promise.resolve().then(() => {
      setStatus('loading')
      load().catch(() => setStatus('error'))
    })
  }, [load])

  if (status === 'loading') {
    return (
      <>
        <FlowBar title="Collaborative fresco" exit="back" />
        <p className="page t-small">Loading&hellip;</p>
      </>
    )
  }
  if (status === 'not-found' || status === 'error' || cf === null) {
    return (
      <>
        <FlowBar title="Collaborative fresco" exit="back" />
        <div className="scroll lined">
          <section className="page empty">
            <h2>This collaborative fresco isn&apos;t available.</h2>
            <Link className="btn-o" to="/collab">
              Back to Collaborative Frescoes
            </Link>
          </section>
        </div>
      </>
    )
  }

  const isOwner = session !== null && session.user.id === cf.ownerId

  const close = async () => {
    setClosing(true)
    await closeCollaborativeFresco(cf.id)
    setClosing(false)
    load()
  }

  return (
    <>
      <FlowBar title={cf.title} exit="back" />
      <div className="scroll lined">
        <div className="page collab-detail">
          {cf.placeName !== null && <p className="meta">{cf.placeName}</p>}
          {cf.description !== null && <p>{cf.description}</p>}
          <p className="t-small">
            {contributions.length} {contributions.length === 1 ? 'artist' : 'artists'}
            {cf.status === 'closed' && ' · Closed to new layers'}
          </p>

          {contributions.length === 0 ? (
            <p className="t-small">No layers yet. Be the first to draw this place.</p>
          ) : (
            <div className="collab-mosaic">
              {contributions.map((c) => (
                <Link key={c.id} to={`/f/${c.frescoId}`} className="card collab-layer">
                  {c.thumbUrl !== '' && <img src={c.thumbUrl} alt={c.label ?? c.contributorName} />}
                  <span className="meta">
                    {c.contributorName}
                    {c.label !== null && c.label !== '' && ` · ${c.label}`}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-y"
            disabled={cf.status === 'closed'}
            onClick={() => navigate(`/new?collab=${cf.id}`)}
          >
            <Icon name="plus" />
            {cf.status === 'closed' ? 'Closed to new layers' : 'Add your layer'}
          </button>

          {isOwner && (
            <>
              <InvitePanel
                collaborativeFrescoId={cf.id}
                userId={cf.ownerId}
                invitations={invitations}
                onInvited={load}
              />
              {cf.status === 'open' && (
                <button type="button" className="btn-o" disabled={closing} onClick={close}>
                  {closing ? 'Closing…' : 'Close to new layers'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
