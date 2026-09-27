/** PHASE-3 task 1: profile display name (editable), sign out. */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
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
      <label>
        Display name
        <input
          type="text"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
        />
      </label>
      <button type="button" onClick={save} disabled={saved || name.trim() === ''}>
        {status === 'saving' ? 'Saving...' : 'Save'}
      </button>
      {status === 'error' && (
        <p className="profile-status" role="alert">
          Couldn't save. Try again.
        </p>
      )}
      <button type="button" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

export function ProfilePage() {
  const { session, loading } = useSession()

  if (loading) return <p className="draw-status">Loading...</p>
  if (session === null) {
    return (
      <section className="placeholder-screen">
        <h2>Profile</h2>
        <SignInPrompt />
      </section>
    )
  }

  return (
    <section className="placeholder-screen">
      <h2>Profile</h2>
      <ProfileEditor userId={session.user.id} />
    </section>
  )
}
