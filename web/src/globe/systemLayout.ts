/**
 * Where each world sits in the sky, how big it is, and how fast it turns.
 *
 * Every value is derived from the account's own id, so a Sinopia has a permanent address: it
 * appears in the same spot, at the same size, on every load and for every viewer. Placing by list
 * position would look the same on first sight and be wrong the moment somebody signed up --
 * every existing world would shuffle to a new place.
 *
 * Nothing here touches the DOM or the database, so the placement rules can be tested directly.
 */

/**
 * FNV-1a. A deterministic, well-spread 32-bit hash -- the point is that the same id always gives
 * the same number, not that it is hard to reverse.
 */
export function hashId(id: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Pulls an independent 0..1 fraction out of one hash, so each property varies on its own. */
function fractionOf(hash: number, shift: number): number {
  return ((hash >>> shift) & 0xff) / 256
}

export interface WorldPlacement {
  /** Percentages of the field, for `left` and `top`. */
  x: number
  y: number
  size: number
  /** Degrees per second on its own axis. Each world turns at its own rate. */
  spin: number
}

/**
 * Scatters the worlds on a ring around the centre, spaced by index so two never overlap, and
 * nudged by the id so the ring does not read as a clock face of evenly spaced dots.
 */
export function placeWorld(
  ownerId: string,
  index: number,
  total: number,
  baseSize: number,
): WorldPlacement {
  const hash = hashId(ownerId)

  // Evenly spaced slots keep them apart; the hash moves each one within its own slot only, so
  // the scatter is irregular but collisions are still impossible.
  const slot = (index + 0.5) / Math.max(total, 1)
  const jitter = (fractionOf(hash, 0) - 0.5) * (0.7 / Math.max(total, 1))
  const angle = (slot + jitter) * Math.PI * 2

  // Rings at different distances so the field has depth rather than one flat circle.
  const radius = 32 + fractionOf(hash, 8) * 13

  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius * 0.86,
    // Half again as large between the smallest and the biggest: clearly varied, never so small
    // that a world becomes an unreadable speck.
    size: Math.round(baseSize * (0.72 + fractionOf(hash, 16) * 0.62)),
    // A lap between 50 and 90 seconds. Varying it stops the sky turning as one rigid piece.
    spin: 4 + fractionOf(hash, 24) * 3.2,
  }
}
