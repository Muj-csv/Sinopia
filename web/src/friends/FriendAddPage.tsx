/**
 * The QR deep-link target: `/friend/<code>`. Scanning someone's QR with an ordinary camera app
 * lands here -- this is the only piece the QR strictly needs; an in-app scanner (ScanCode.tsx) is
 * an optional shortcut to the same place.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { Avatar } from '../auth/Avatar'
import { parseAvatar } from '../auth/avatarConfig'
import { useSession } from '../lib/useSession'
import { supabase } from '../lib/supabase'
import { Icon } from '../ui/Icon'
import './friends.css'
import { sendFriendRequestByCode } from './friends'

type Lookup =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'self' }
  | { status: 'found'; id: string; name: string; avatar: unknown }

function AddByCode({ myId, code }: { myId: string; code: string }) {
  const [lookup, setLookup] = useState<Lookup>({ status: 'loading' })
  const [sent, setSent] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    // A plain async function rather than .then().catch() chained straight off the query builder:
    // PostgrestFilterBuilder is only a "thenable" (has .then, to be awaitable), not a full Promise,
    // so TypeScript's build config (tsc -b, unlike a plain tsc --noEmit check) rejects .catch() on
    // it directly.
    const lookup = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar')
          .eq('friend_code', code.toUpperCase())
          .maybeSingle()
        if (cancelled) return
        // A dropped error here used to read identically to "no such code" -- a real failure (RLS,
        // network) looked exactly like a typo, with nothing to tell them apart.
        if (error !== null) {
          console.error('friend_code lookup failed:', error)
          setLookup({ status: 'error', message: error.message })
        } else if (data === null || data === undefined) setLookup({ status: 'not-found' })
        else if (data.id === myId) setLookup({ status: 'self' })
        else
          setLookup({ status: 'found', id: data.id, name: data.display_name, avatar: data.avatar })
      } catch (err) {
        if (cancelled) return
        console.error('friend_code lookup threw:', err)
        setLookup({ status: 'error', message: 'Something went wrong looking that up.' })
      }
    }
    void lookup()
    return () => {
      cancelled = true
    }
  }, [myId, code])

  const add = async () => {
    setSending(true)
    try {
      const result = await sendFriendRequestByCode(myId, code)
      setSent(result.ok ? 'Request sent.' : result.message)
    } finally {
      setSending(false)
    }
  }

  if (lookup.status === 'loading') return <p className="t-small">Looking that code up&hellip;</p>

  if (lookup.status === 'not-found') {
    return (
      <p className="notice danger" role="alert">
        <Icon name="warn" />
        <span>No artist found with that code.</span>
      </p>
    )
  }

  if (lookup.status === 'error') {
    return (
      <p className="notice danger" role="alert">
        <Icon name="warn" />
        <span>Couldn&apos;t look that code up: {lookup.message}</span>
      </p>
    )
  }

  if (lookup.status === 'self') {
    return (
      <p className="notice">
        <Icon name="info" />
        <span>That&apos;s your own code -- share it with someone else to add you.</span>
      </p>
    )
  }

  return (
    <div className="friend-add-card">
      <Avatar config={parseAvatar(lookup.avatar)} size={96} />
      <h2>{lookup.name}</h2>
      {sent === null ? (
        <button type="button" className="btn-y" disabled={sending} onClick={add}>
          {sending ? 'Sending…' : 'Add as a Sinopia Neighbor'}
        </button>
      ) : (
        <p className="t-small" role="status">
          {sent}
        </p>
      )}
      <Link className="link" to="/friends">
        Go to Friends
      </Link>
    </div>
  )
}

export function FriendAddPage() {
  const { code } = useParams<{ code: string }>()
  const { session, loading } = useSession()
  if (loading) return <p className="page t-small">Loading&hellip;</p>

  return (
    <div className="scroll lined">
      <section className="page friend-add-page">
        <AuthGate message="Sign in to add a Sinopia Neighbor.">
          {session !== null && code !== undefined && (
            <AddByCode myId={session.user.id} code={code} />
          )}
        </AuthGate>
      </section>
    </div>
  )
}
