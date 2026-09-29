/**
 * The OpenFreeMap style, fetched once for the whole page.
 *
 * The system view puts several globes on screen at once, and handing each `new maplibregl.Map` a
 * URL makes every one of them fetch and parse the same large style document. One fetch, shared.
 *
 * Each caller gets its own deep copy: MapLibre mutates the style object it is given (it resolves
 * sprites, normalises sources, tracks layer state on it), so passing one object to several maps
 * lets them corrupt each other's layers in ways that surface much later as a blank sphere.
 */
import type { StyleSpecification } from 'maplibre-gl'

export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

let pending: Promise<StyleSpecification> | null = null

export function loadMapStyle(): Promise<StyleSpecification> {
  pending ??= fetch(OPENFREEMAP_STYLE).then((res) => {
    if (!res.ok) throw new Error(`style ${res.status}`)
    return res.json() as Promise<StyleSpecification>
  })
  // A failed fetch must not poison every later globe, so the cache is cleared on the way out.
  return pending
    .then((style) => structuredClone(style))
    .catch((error) => {
      pending = null
      throw error
    })
}
