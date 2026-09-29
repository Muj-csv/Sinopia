/**
 * Camera moves between Sinopias (Update 1.2 §9, §16).
 *
 * "Warp" here is a camera move, not an effects pass. DESIGN_BRIEF.md §11 forbids a glow halo, an
 * auto-spin and blur of any kind, and SCREENS.md repeats it for this screen, so travelling to
 * another artist's world is sold by *movement* -- pulling back far enough to see you crossed the
 * planet, then settling -- rather than by starfields and bloom. It reads as space because the
 * distance is real, which is also the cheapest thing to render.
 */
import type * as maplibregl from 'maplibre-gl'

/** Someone who asked for less motion gets the destination, not the journey. */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** A place chosen from search: a straightforward arrival, no pull-back. */
export function flyToPlace(map: maplibregl.Map | null, lng: number, lat: number, zoom = 12): void {
  if (map === null) return
  if (prefersReducedMotion()) {
    map.jumpTo({ center: [lng, lat], zoom })
    return
  }
  map.flyTo({ center: [lng, lat], zoom, duration: 1600, essential: true })
}

/**
 * Travelling to another artist's world. `flyTo` alone would slide across the surface; `curve`
 * high enough makes MapLibre zoom out on the way, so you see the whole globe turn over before you
 * drop back in. That arc is the whole effect.
 */
export function warpTo(map: maplibregl.Map | null, lng: number, lat: number, zoom = 11): void {
  if (map === null) return
  if (prefersReducedMotion()) {
    map.jumpTo({ center: [lng, lat], zoom })
    return
  }
  map.flyTo({
    center: [lng, lat],
    zoom,
    // Above ~1.7 the flight arcs out to a world view before descending, which is what makes this
    // read as travel between worlds rather than a pan across one.
    curve: 1.9,
    speed: 0.9,
    duration: 2600,
    essential: true,
  })
}
