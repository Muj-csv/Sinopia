import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A tool popover (colour, size, layers) on lined paper with an ink edge and offset.
 *
 * Design Council #7: focus moves into the popover when it opens and returns to the button that
 * opened it on Esc or on close, otherwise a keyboard user opens Colour and is left standing on the
 * trigger with no way into the controls.
 */
export function Popover({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  /** Captured on mount, because by the time we close, focus may be anywhere. */
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
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
        onClose()
      }
    }
    const node = ref.current
    node?.addEventListener('keydown', onKeyDown)
    return () => node?.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="pop" role="dialog" aria-label={label} ref={ref}>
      {children}
    </div>
  )
}
