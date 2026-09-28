import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

/**
 * The top bar for the full-screen flow screens (Capture, Pin check, Canvas, Finish).
 *
 * The primary nav is hidden on those routes (UX_MAP: they are full-screen and carry their own
 * exit), so this bar is the only way out. Every flow screen must render one.
 */
export function FlowBar({
  title,
  onExit,
  exit = 'close',
  children,
}: {
  title: string
  /** Defaults to going back one entry, which keeps the flow's own order. */
  onExit?: () => void
  /** `close` leaves the flow; `back` steps within it. */
  exit?: 'close' | 'back'
  /** Trailing actions: undo/redo, Finish, and so on. */
  children?: ReactNode
}) {
  const navigate = useNavigate()

  return (
    <header className="bar">
      <button
        type="button"
        className="ibtn"
        onClick={onExit ?? (() => (exit === 'close' ? navigate('/') : navigate(-1)))}
      >
        <Icon name={exit === 'close' ? 'x' : 'back'} label={exit === 'close' ? 'Close' : 'Back'} />
      </button>
      <h1 className="title">{title}</h1>
      {children}
    </header>
  )
}
