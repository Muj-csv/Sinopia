/**
 * The other worlds (Update 1.2 §8). Each connected account's Sinopia is its own globe, drawn as a
 * small planet around the edge of the one you are standing in. Selecting one travels there.
 *
 * Not a friend list: they are placed around the view, at a radius, so the arrangement says "these
 * are other worlds near mine" rather than "here are some rows of people". Kept in the ink-on-paper
 * register -- an ink disc with the artist's face on it and a hard offset -- because the space
 * language here is paper, not a starfield (DESIGN_BRIEF §11 forbids glow and blur).
 */
import { Avatar } from '../auth/Avatar'
import type { Sinopia } from './sinopias'

/**
 * How many worlds are on screen at once, by width. A phone gets a handful because the planets
 * would otherwise overlap the map and each other; a desktop can hold the whole ring.
 */
function visibleCount(width: number): number {
  if (width < 640) return 3
  if (width < 900) return 5
  return 8
}

/**
 * Places each world on an ellipse around the view. Wider than tall so the planets sit clear of
 * the search bar at the top and the preview card at the bottom, and starting at -90deg so the
 * first one is directly above rather than off to one side.
 */
function positionOf(index: number, total: number): { left: string; top: string } {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  return {
    left: `${50 + Math.cos(angle) * 42}%`,
    top: `${50 + Math.sin(angle) * 38}%`,
  }
}

export function SinopiaOrbit({
  sinopias,
  width,
  onVisit,
}: {
  sinopias: readonly Sinopia[]
  width: number
  onVisit: (sinopia: Sinopia) => void
}) {
  const shown = sinopias.slice(0, visibleCount(width))
  if (shown.length === 0) return null

  return (
    <div className="sinopia-orbit">
      {shown.map((sinopia, i) => (
        <button
          key={sinopia.ownerId}
          type="button"
          className="sinopia-planet"
          style={positionOf(i, shown.length)}
          onClick={() => onVisit(sinopia)}
        >
          <Avatar config={sinopia.avatar} size={40} />
          <span className="sinopia-planet-name">{sinopia.name}</span>
        </button>
      ))}
      {sinopias.length > shown.length && (
        <p className="sinopia-orbit-more">{sinopias.length - shown.length} more further out</p>
      )}
    </div>
  )
}
