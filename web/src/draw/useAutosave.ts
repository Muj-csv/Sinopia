/** FR-004: autosave the draft every 10s and on page hide, so a reload resumes it. */
import { useEffect, useRef } from 'react'
import { updateDraft, type Draft } from '../lib/draftStore'

const AUTOSAVE_INTERVAL_MS = 10_000

export function useAutosave(
  draftId: string | null,
  patch: Partial<Omit<Draft, 'id' | 'createdAt'>>,
) {
  const patchRef = useRef(patch)

  useEffect(() => {
    patchRef.current = patch
  }, [patch])

  useEffect(() => {
    if (draftId === null) return

    const save = () => {
      updateDraft(draftId, patchRef.current)
    }

    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [draftId])
}
