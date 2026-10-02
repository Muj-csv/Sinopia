/**
 * Which achievement ids have already been shown as an unlock toast, per account -- keyed by user
 * id (not a flat key like localMilestones.ts) so a shared device signing into a second account
 * doesn't inherit the first account's notification history or, worse, silently skip toasts for
 * achievements the second account hasn't actually seen yet.
 */
const KEY_PREFIX = 'sinopia:achievements:seen:'

export function readSeen(userId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + userId)
    return raw === null ? new Set() : new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function writeSeen(userId: string, ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(Array.from(ids)))
  } catch {
    // Storage unavailable -- achievements still compute correctly; a toast might just repeat.
  }
}
