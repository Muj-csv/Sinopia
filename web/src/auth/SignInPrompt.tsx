/** PHASE-3 task 1: shared sign-in UI for AuthGate and ProfilePage. */
import { supabase } from '../lib/supabase'
import './auth.css'

export function SignInPrompt({ message }: { message?: string }) {
  const signIn = (provider: 'google' | 'github') => {
    // Explicit redirectTo so the user "returns with the drawing intact" (UX_MAP)
    // instead of landing back on a default page after OAuth consent.
    supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } })
  }

  return (
    <div className="sign-in-prompt">
      {message !== undefined && <p>{message}</p>}
      <div className="sign-in-buttons">
        <button type="button" onClick={() => signIn('google')}>
          Sign in with Google
        </button>
        <button type="button" onClick={() => signIn('github')}>
          Sign in with GitHub
        </button>
      </div>
    </div>
  )
}
