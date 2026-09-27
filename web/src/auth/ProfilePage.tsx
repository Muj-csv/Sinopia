/** Placeholder for Phase 0's OAuth wiring. */
import { supabase } from '../lib/supabase'

export function ProfilePage() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({ provider: 'github' })
  }

  return (
    <section className="placeholder-screen">
      <h2>Profile</h2>
      <div className="placeholder-actions">
        <button type="button" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
        <button type="button" onClick={signInWithGitHub}>
          Sign in with GitHub
        </button>
      </div>
    </section>
  )
}
