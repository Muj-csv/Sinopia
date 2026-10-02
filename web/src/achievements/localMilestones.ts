/**
 * One-off "has this ever happened on this device" flags for the handful of achievements that
 * aren't derivable from Supabase data (e.g. "picked a colour from a photo" leaves no row anywhere
 * -- draft strokes and tool choices never leave the browser). Same local-only tier as the
 * Sketchbook's "Underdrawings -- on this device only" shelf: a fresh browser starts these over,
 * which is an acceptable trade for not needing a table anyone has to migrate.
 */
export type LocalMilestone = 'eyedropper' | 'pinned-reference' | 'doodle-guess'

const KEY_PREFIX = 'sinopia:milestone:'

export function hasMilestone(milestone: LocalMilestone): boolean {
  try {
    return window.localStorage.getItem(KEY_PREFIX + milestone) !== null
  } catch {
    return false
  }
}

/** Idempotent: marking an already-reached milestone again is a no-op. */
export function markMilestone(milestone: LocalMilestone): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + milestone, '1')
  } catch {
    // Storage can be unavailable (private mode, quota) -- the achievement just won't unlock.
  }
}
