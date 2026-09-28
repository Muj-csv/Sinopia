/** PHASE-3 task 1: profile display name (editable), sign out. Reached from the Sketchbook header;
 *  it isn't a nav destination of its own (SCREENS.md folds it into Sketchbook). */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './auth.css'
import { SignInPrompt } from './SignInPrompt'

const MAX_NAME_LENGTH = 40

function ProfileEditor({ userId }: { userId: string }) {
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data !== null) setName(data.display_name)
      })
  }, [userId])

  const save = async () => {
    setStatus('saving')
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', userId)
    setStatus(error ? 'error' : 'saved')
    setSaved(!error)
  }

  return (
    <div className="profile-editor">
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
