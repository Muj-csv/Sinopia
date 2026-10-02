/**
 * App-wide toasts: a save confirmation, a publish confirmation, an achievement unlock. Mounted
 * once at the app root (App.tsx) so any screen can call useToast() without plumbing a prop down.
 *
 * Paper and an ink edge, never yellow (DESIGN_BRIEF.md §11 reserves yellow for a fill with ink on
 * it, which a passive notice is not) -- the same reasoning `.notice` already follows elsewhere.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { ToastContext } from './toastContext'
import './ui.css'

interface ToastItem {
  id: string
  message: string
  icon: IconName
}

const DISPLAY_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer)
    },
    [],
  )

  const show = useCallback((message: string, icon: IconName = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, icon }])
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timers.current.delete(id)
    }, DISPLAY_MS)
    timers.current.set(id, timer)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* aria-live announces each toast as it arrives without moving focus, so it never interrupts
          whatever the artist is doing (drawing, typing a title) to read it out. */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className="toast">
            <Icon name={t.icon} />
            <span>{t.message}</span>
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
