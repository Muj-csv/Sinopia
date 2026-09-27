/** Task 1: "pin one reference to keep it visible while drawing" -- stays up even if the panel is closed. */
import type { Reference } from './referencesClient'

export function PinnedReference({
  reference,
  onUnpin,
}: {
  reference: Reference
  onUnpin: () => void
}) {
  return (
    <div className="pinned-reference">
      <img src={reference.thumbnail} alt={reference.title} />
      <button type="button" onClick={onUnpin}>
        Unpin
      </button>
    </div>
  )
}
