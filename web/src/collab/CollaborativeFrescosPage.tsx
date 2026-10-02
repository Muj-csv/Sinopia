/**
 * '/collab': every collaborative fresco you can currently see -- yours, ones you're invited to, or
 * ones you've already contributed a layer to (the same set the RLS select policy on
 * collaborative_frescos already defines, so this is just "show me everything the query returns").
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './collab.css'
import { fetchMyCollaborativeFrescos, type CollaborativeFresco } from './collaborativeFrescos'

type Status = 'loading' | 'ready' | 'error'

function CollabList({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [frescos, setFrescos] = useState<CollaborativeFresco[]>([])

  useEffect(() => {
    let cancelled = false
    fetchMyCollaborativeFrescos()
      .then((rows) => {
        if (!cancelled) {
          setFrescos(rows)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <Link to="/collab/new" className="btn-y">
        <Icon name="plus" />
        Start a collaborative fresco
      </Link>

      {status === 'loading' && <p className="t-small">Loading&hellip;</p>}
      {status === 'error' && (
        <p className="notice danger" role="alert">
          <Icon name="warn" />
          <span>Couldn&apos;t load your collaborative frescoes.</span>
        </p>
      )}
      {status === 'ready' && frescos.length === 0 && (
        <p className="t-small">
          None yet. Start one from a place, or wait for someone to invite you.
        </p>
      )}
      {status === 'ready' && frescos.length > 0 && (
        <div className="collab-list">
          {frescos.map((cf) => (
            <Link key={cf.id} to={`/collab/${cf.id}`} className="card">
              <h3 className="title">{cf.title}</h3>
              <p className="meta">
                {cf.ownerId === userId ? 'You organize this' : 'You were invited'}
                {cf.placeName !== null && ` · ${cf.placeName}`}
                {cf.status === 'closed' && ' · Closed'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

export function CollaborativeFrescosPage() {
  const { session, loading } = useSession()

  return (
    <div className="scroll lined">
      <section className="page">
        <h1>Collaborative Frescoes</h1>
        <p className="t-small">
          One shared place, many independently credited layers -- never one canvas everyone
          overwrites.
        </p>
        {loading ? (
          <p className="t-small">Loading&hellip;</p>
        ) : (
          <AuthGate message="Sign in to see your collaborative frescoes.">
            {session !== null && <CollabList userId={session.user.id} />}
          </AuthGate>
        )}
      </section>
    </div>
  )
}
