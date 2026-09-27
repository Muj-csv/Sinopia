/** PHASE-3 task 1: sign-in gate for New, Publish and Report. */
import type { ReactNode } from 'react'
import { useSession } from '../lib/useSession'
import { SignInPrompt } from './SignInPrompt'

export function AuthGate({ message, children }: { message?: string; children: ReactNode }) {
  const { session, loading } = useSession()

  if (loading) return <p className="draw-status">Loading...</p>
  if (session === null) return <SignInPrompt message={message} />
  return <>{children}</>
}
