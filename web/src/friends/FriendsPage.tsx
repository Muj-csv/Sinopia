/**
 * The Friends tab: who you've added (Sinopia Neighbors) and the requests waiting on an answer,
 * plus adding someone new by their code or by scanning theirs. A separate tab from Profile --
 * Profile is where *your own* code and QR live (ProfilePage.tsx); this is where other people's
 * requests and your neighbor list live.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { Avatar } from '../auth/Avatar'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './friends.css'
import {
  acceptFriendRequest,
  loadFriendsData,
  removeFriendRequest,
  sendFriendRequestByCode,
  type FriendsData,
} from './friends'
import { ScanCode } from './ScanCode'

type Status = 'loading' | 'ready' | 'error'

function NeighborsPage({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<FriendsData>({ neighbors: [], incoming: [], outgoing: [] })
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      setData(await loadFriendsData(userId))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [userId])

  useEffect(() => {
    // load() sets state synchronously as its first line (fine from event handlers, e.g. Retry) --
    // deferred a tick here so the effect body itself doesn't call setState synchronously.
    void Promise.resolve().then(load)
  }, [load])

  const addByCode = async () => {
    setSending(true)
    setMessage(null)
    try {
      const result = await sendFriendRequestByCode(userId, code)
      setMessage(result.ok ? 'Request sent.' : result.message)
      if (result.ok) {
        setCode('')
        void load()
      }
    } finally {
      // Always, even if something above threw: this used to be able to leave the button reading
      // "Sending…" forever with no explanation.
      setSending(false)
    }
  }

  const accept = async (requestId: string) => {
    setBusyId(requestId)
    if (await acceptFriendRequest(requestId)) await load()
    setBusyId(null)
  }
  const remove = async (requestId: string) => {
    setBusyId(requestId)
    if (await removeFriendRequest(requestId)) await load()
    setBusyId(null)
  }

  return (
    <div className="scroll lined">
      <div className="page friends-page">
        <h1>Friends</h1>

        <section className="friends-add">
          <h2>Add a Sinopia Neighbor</h2>
          <p className="t-small">
            Enter their code, or scan theirs. Yours is on your{' '}
            <Link className="link" to="/me">
              Profile
            </Link>
            .
          </p>
          <div className="friends-add-row">
            <input
              type="text"
              inputMode="text"
              maxLength={8}
              placeholder="e.g. 4F2A9C1B"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="friends-code-input"
              aria-label="Their Sinopia code"
            />
            <button
              type="button"
              className="btn-y"
              disabled={sending || code.trim() === ''}
              onClick={addByCode}
            >
              {sending ? 'Sending…' : 'Add'}
            </button>
          </div>
          <button type="button" className="btn-o" onClick={() => setScanning(true)}>
            <Icon name="camera" />
            Scan a code
          </button>
          {message !== null && (
            <p className="t-small" role="status">
              {message}
            </p>
          )}
        </section>

        {status === 'loading' && <p className="t-small">Loading&hellip;</p>}
        {status === 'error' && (
          <p className="notice danger" role="alert">
            <Icon name="warn" />
            <span>
              Couldn&apos;t load your Friends.{' '}
              <button type="button" className="link" onClick={load}>
                Retry
              </button>
            </span>
          </p>
        )}

        {status === 'ready' && data.incoming.length > 0 && (
          <section className="friends-section">
            <h2>Friend requests</h2>
            <ul className="friend-list">
              {data.incoming.map((req) => (
                <li key={req.id} className="friend-row">
                  <Avatar config={req.other.avatar} size={44} />
                  <span className="friend-row-name">{req.other.name}</span>
                  <div className="friend-row-actions">
                    <button
                      type="button"
                      className="ibtn"
                      disabled={busyId === req.id}
                      onClick={() => accept(req.id)}
                    >
                      <Icon name="check" label={`Accept ${req.other.name}`} />
                    </button>
                    <button
                      type="button"
                      className="ibtn"
                      disabled={busyId === req.id}
                      onClick={() => remove(req.id)}
                    >
                      <Icon name="x" label={`Decline ${req.other.name}`} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === 'ready' && data.outgoing.length > 0 && (
          <section className="friends-section">
            <h2>Sent, waiting on them</h2>
            <ul className="friend-list">
              {data.outgoing.map((req) => (
                <li key={req.id} className="friend-row">
                  <Avatar config={req.other.avatar} size={44} />
                  <span className="friend-row-name">{req.other.name}</span>
                  <div className="friend-row-actions">
                    <button
                      type="button"
                      className="ibtn"
                      disabled={busyId === req.id}
                      onClick={() => remove(req.id)}
                    >
                      <Icon name="x" label={`Cancel request to ${req.other.name}`} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === 'ready' && (
          <section className="friends-section">
            <h2>Sinopia Neighbors</h2>
            {data.neighbors.length === 0 ? (
              <p className="t-small">
                No neighbors yet. Once you add each other, both of your Sinopias appear on each
                other&apos;s globe screen.
              </p>
            ) : (
              <ul className="friend-list">
                {data.neighbors.map((n) => (
                  <li key={n.id} className="friend-row">
                    <Link to={`/s/${n.id}`} className="friend-row-link">
                      <Avatar config={n.avatar} size={44} />
                      <span className="friend-row-name">{n.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {scanning && (
        <div className="scrim" onClick={() => setScanning(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <ScanCode onClose={() => setScanning(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

export function FriendsPage() {
  const { session, loading } = useSession()
  if (loading) return <p className="page t-small">Loading&hellip;</p>

  return (
    <AuthGate message="Sign in to see your Friends.">
      {session !== null && <NeighborsPage userId={session.user.id} />}
    </AuthGate>
  )
}
