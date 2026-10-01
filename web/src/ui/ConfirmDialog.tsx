import { useEffect, useRef } from 'react'

/**
 * A yes/no confirmation for a destructive action, in the app's own ink-on-paper language instead
 * of the browser's native confirm() -- which looks like the OS, not like Sinopia, and reads
 * differently (or not at all) across browsers and platforms.
 *
 * Same focus discipline as Popover.tsx: focus moves into the dialog when it opens and returns to
 * whatever opened it when it closes, Escape cancels, and a click on the backdrop cancels too --
 * the only way to confirm is the explicit button, never an accidental dismiss.
 */
export function ConfirmDialog({
  message,
  confirmLabel = 'Remove',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('button')
    first?.focus()
    return () => {
      const opener = openerRef.current
      if (opener !== null && document.contains(opener)) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      }
    }
    const node = ref.current
    node?.addEventListener('keydown', onKeyDown)
    return () => node?.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="scrim" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn-o" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-o danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
