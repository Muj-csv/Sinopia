/** PHASE-3 task 1, extended by Update 1.2: avatar, display name, how much you have drawn, sign
 *  out. Now a nav destination of its own rather than a link buried in the Sketchbook header. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './auth.css'
import { Avatar } from './Avatar'
import { AvatarPicker } from './AvatarPicker'
import { DEFAULT_AVATAR, parseAvatar, type AvatarConfig } from './avatarConfig'
import { SignInPrompt } from './SignInPrompt'

const MAX_NAME_LENGTH = 40

function ProfileEditor({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [frescoCount, setFrescoCount] = useState<number | null>(null)
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name, avatar')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data === null) return
        setName(data.display_name)
        setAvatar(parseAvatar(data.avatar))
      })
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

  const save = async () => {
    setStatus('saving')
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name, avatar })
      .eq('id', userId)
    setStatus(error ? 'error' : 'saved')
    setSaved(!error)
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
        <AvatarPicker
          config={avatar}
          onChange={(next) => {
            setAvatar(next)
            setSaved(false)
          }}
        />
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

      {status === 'error' && (
        <p className="notice danger" role="alert">
          <Icon name="warn" />
          <span>Couldn&apos;t save. Try again.</span>
        </p>
      )}

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
