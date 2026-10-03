/** Task 1: "pin references to keep them visible while drawing" -- stays up even if the panel is
 *  closed. Supports more than one: each pin is its own thumb, with its own unpin, and clicking a
 *  thumb opens it full-size (same lightbox the search grid's "enlarge" uses). */
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import type { Reference } from './referencesClient'

export function PinnedReferences({
  references,
  onUnpin,
  onExpand,
  leading,
}: {
  references: Reference[]
  onUnpin: (id: string) => void
  onExpand: (reference: Reference) => void
  /** Shown above the pins in the same column (Draw This Wall's "Responding to" card). */
  leading?: ReactNode
}) {
  if (references.length === 0 && leading === undefined) return null

  return (
    <div className="pinned-references">
      {leading}
      {references.map((reference) => (
        <div key={reference.id} className="pinned-reference">
          <button
            type="button"
            className="pinned-reference-thumb"
            onClick={() => onExpand(reference)}
          >
            <img src={reference.thumbnail} alt={reference.title} />
          </button>
          <button type="button" className="ibtn refpin-unpin" onClick={() => onUnpin(reference.id)}>
            <Icon name="x" label={`Unpin ${reference.title}`} />
          </button>
        </div>
      ))}
    </div>
  )
}
