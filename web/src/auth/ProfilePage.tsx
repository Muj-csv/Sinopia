/** PHASE-3 task 1, extended by Update 1.2: avatar, display name, how much you have drawn, sign
 *  out. Now a nav destination of its own rather than a link buried in the Sketchbook header. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './auth.css'
import { Avatar } from './Avatar'
import { AvatarPicker } from './AvatarPicker'
import { DEFAULT_AVATAR, parseAvatar, type AvatarConfig } from './avatarConfig'
import { SignInPrompt } from './SignInPrompt'
import { SinopiaCodeCard } from '../friends/SinopiaCodeCard'

const MAX_NAME_LENGTH = 40

/**
 * True when Postgres is telling us `profiles.avatar` does not exist, which means
 * 0003_profile_avatar.sql has not been applied to this project yet. Merging a migration does not
 * run it (CLAUDE.md), so a deploy can easily be ahead of its database, and when that happens the
 * name must still be savable.
 */
function isMissingAvatarColumn(error: { code?: string; message?: string } | null): boolean {
  if (error === null) return false
  // 42703 is Postgres "undefined column"; PGRST204 is PostgREST's schema-cache equivalent.
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (error.message?.includes('avatar') === true && error.message.includes('column'))
  )
}

function ProfileEditor({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [avatarStored, setAvatarStored] = useState(true)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [frescoCount, setFrescoCount] = useState<number | null>(null)
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [problem, setProblem] = useState<string | null>(null)
  /**
   * Separate from `status`/`saved`: those track the display-name field, which needs an explicit
   * Save so typing doesn't fire a write per keystroke. A tap on a swatch is already one complete,
   * deliberate choice -- closer to flipping a switch than typing a sentence -- so it saves itself,
   * the moment it's picked, rather than waiting on a Save button below the fold that a "Done with
   * the avatar" button right above it reads as already having pressed.
   */
  const [avatarSaveStatus, setAvatarSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const avatarSaveTimer = useRef<number | null>(null)
  /** The pick still waiting on the debounce below, if any -- flushed rather than dropped on unmount. */
  const pendingAvatarRef = useRef<AvatarConfig | null>(null)
  const [friendCode, setFriendCode] = useState<string | null>(null)

  // Independent of the avatar load below: friend_code needs 0004_friends.sql applied, avatar
  // needs 0003_profile_avatar.sql, and a project can be ahead of its database on either one
  // without the other. Missing here just means the code card doesn't render, same as avatar
  // falls back to a name-only editor -- neither blocks the rest of the page.
  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('friend_code')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFriendCode(data?.friend_code ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const withAvatar = await supabase
        .from('profiles')
        .select('display_name, avatar')
        .eq('id', userId)
        .maybeSingle()

      if (!isMissingAvatarColumn(withAvatar.error)) {
        if (cancelled || withAvatar.data === null) return
        setName(withAvatar.data.display_name)
        setAvatar(parseAvatar(withAvatar.data.avatar))
        return
      }

      // Without the column there is still a name to edit, so the page keeps working.
      const nameOnly = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled || nameOnly.data === null) return
      setAvatarStored(false)
      setName(nameOnly.data.display_name)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  // How much you have made, which is the only number on this page. Not a score, and nobody
  // else's is ever shown next to it (CLAUDE.md: no rankings).
  useEffect(() => {
    supabase
      .from('frescoes')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .then(({ count }) => setFrescoCount(count ?? 0))
  }, [userId])

  /** Writes just the avatar, independent of the name field and its own Save button. */
  const persistAvatar = useCallback(
    async (next: AvatarConfig) => {
      // Nothing to write without the column; the picker still works locally, and the notice
      // already says why (see the `avatarStored` branch below).
      if (!avatarStored) return
      setAvatarSaveStatus('saving')
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar: next })
        .eq('id', userId)
        .select('id')

      if (isMissingAvatarColumn(error)) {
        setAvatarStored(false)
        setAvatarSaveStatus('idle')
        return
      }
      if (error !== null || data === null || data.length === 0) {
        setAvatarSaveStatus('error')
        return
      }
      setAvatarSaveStatus('saved')
    },
    [userId, avatarStored],
  )

  useEffect(() => {
    return () => {
      // Flush rather than drop: cancelling the debounce here (the original bug) meant a pick made
      // right before switching tabs or navigating away -- the debounce's whole window -- was lost
      // with nothing saved and nothing shown. The write itself isn't tied to this component's
      // lifetime once it's fired, so starting it here still lands even though we're unmounting.
      if (avatarSaveTimer.current !== null) {
        window.clearTimeout(avatarSaveTimer.current)
        avatarSaveTimer.current = null
        if (pendingAvatarRef.current !== null) {
          void persistAvatar(pendingAvatarRef.current)
          pendingAvatarRef.current = null
        }
      }
    }
  }, [persistAvatar])

  const save = async () => {
    setStatus('saving')
    setProblem(null)

    /**
     * Asks for the changed row back. An `update` that matches nothing is not an error in
     * PostgREST -- it reports success having written precisely nothing -- so without `select()`
     * a save that silently hit no row is indistinguishable from one that worked. That is the
     * difference between "Saved" and actually saved.
     */
    const write = (payload: Record<string, unknown>) =>
      supabase.from('profiles').update(payload).eq('id', userId).select('id')

    let { data, error } = await write(
      avatarStored ? { display_name: name, avatar } : { display_name: name },
    )

    // The database is behind the app: keep the name, and say what is missing rather than failing
    // the whole save because of the avatar.
    if (isMissingAvatarColumn(error)) {
      setAvatarStored(false)
      ;({ data, error } = await write({ display_name: name }))
      if (error === null && data !== null && data.length > 0) {
        setStatus('saved')
        setSaved(true)
        setProblem('Your name is saved. The avatar needs migration 0003 applying first.')
        return
      }
    }

    if (error !== null) {
      setStatus('error')
      setProblem(error.message)
      return
    }
    if (data === null || data.length === 0) {
      setStatus('error')
      setProblem('That profile could not be found, so nothing was saved. Try signing in again.')
      return
    }
    setStatus('saved')
    setSaved(true)
  }

  return (
    <div className="profile-editor">
      <div className="profile-identity">
        <Avatar config={avatar} size={96} />
        <div>
          <p className="profile-count t-small">
            {frescoCount === null
              ? 'Counting your frescoes…'
              : frescoCount === 1
                ? '1 fresco'
                : `${frescoCount} frescoes`}
          </p>
          <button
            type="button"
            className="btn-o"
            aria-expanded={editingAvatar}
            onClick={() => setEditingAvatar((open) => !open)}
          >
            {editingAvatar ? 'Done with the avatar' : 'Change avatar'}
          </button>
        </div>
      </div>

      {editingAvatar && (
        <>
          <AvatarPicker
            config={avatar}
            onChange={(next) => {
              setAvatar(next)
              pendingAvatarRef.current = next
              if (avatarSaveTimer.current !== null) window.clearTimeout(avatarSaveTimer.current)
              // A short debounce, not an immediate write per tap: flipping through five hair
              // colours in a row shouldn't fire five requests, just the one that's left showing.
              // (If they leave before it fires, the unmount cleanup above flushes it anyway.)
              avatarSaveTimer.current = window.setTimeout(() => {
                avatarSaveTimer.current = null
                pendingAvatarRef.current = null
                void persistAvatar(next)
              }, 400)
            }}
          />
          <p className="t-small" role="status">
            {!avatarStored
              ? 'Your name is saved. The avatar needs migration 0003 applying first.'
              : avatarSaveStatus === 'saving'
                ? 'Saving…'
                : avatarSaveStatus === 'error'
                  ? "Couldn't save your avatar. Try picking again."
                  : avatarSaveStatus === 'saved'
                    ? 'Saved.'
                    : null}
          </p>
        </>
      )}

      <label className="field">
        <span>Display name</span>
        <input
          type="text"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
        />
        <span className="help">This is the name on every fresco you publish.</span>
      </label>

      <button type="button" className="btn-y" onClick={save} disabled={saved || name.trim() === ''}>
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {/* The reason is shown, not just "try again": the two ways this actually fails -- an
          unapplied migration and a missing profile row -- are both fixable, and neither is fixed
          by pressing the button a second time. */}
      {status === 'error' && (
        <p className="notice danger" role="alert">
          <Icon name="warn" />
          <span>{problem ?? "Couldn't save. Try again."}</span>
        </p>
      )}
      {status === 'saved' && problem !== null && (
        <p className="notice" role="status">
          <Icon name="info" />
          <span>{problem}</span>
        </p>
      )}
      {status === 'saved' && problem === null && (
        <p className="t-small" role="status">
          Saved.
        </p>
      )}

      {friendCode !== null && <SinopiaCodeCard code={friendCode} />}

      <Link className="btn-o" to="/achievements">
        <Icon name="trophy" />
        Achievements
      </Link>

      <button type="button" className="btn-o" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

export function ProfilePage() {
  const { session, loading } = useSession()

  return (
    <div className="scroll lined">
      <section className="page">
        <h1>Profile</h1>
        {loading ? (
          <p className="t-small">Loading&hellip;</p>
        ) : session === null ? (
          <SignInPrompt />
        ) : (
          <ProfileEditor userId={session.user.id} />
        )}
        <p>
          <Link className="link" to="/about">
            About Sinopia, licences and credits
          </Link>
        </p>
      </section>
    </div>
  )
}
