/**
 * PHASE-3 task 1: shared sign-in UI for AuthGate and ProfilePage.
 *
 * SCREENS.md "Sign-in sheet": a lined sheet, one sentence on why, and the two providers as
 * full-width paper buttons of equal weight -- neither is yellow, because neither is the
 * recommended one. No brand-coloured logo buttons.
 */
import { Link } from 'react-router-dom'
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
      <div className="sign-in-card lined">
        <h2>Sign in to draw</h2>
        <p>{message ?? 'An account keeps your frescoes yours, on any device you sign in from.'}</p>

        <div className="sign-in-buttons">
          <button type="button" className="btn-o btn-wide" onClick={() => signIn('google')}>
            Continue with Google
          </button>
          <button type="button" className="btn-o btn-wide" onClick={() => signIn('github')}>
            Continue with GitHub
          </button>
        </div>

        <p className="t-small">
          We only ever ask for your name and email. Your drafts stay on this device until you
          publish.
        </p>
        <p className="t-small">
          You must be 13 or older to continue.{' '}
          <Link className="link" to="/terms">
            Terms &amp; safety
          </Link>
        </p>
      </div>
    </div>
  )
}
