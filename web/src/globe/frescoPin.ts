/**
 * A fresco on the globe is its own drawing, not a dot (DESIGN_BRIEF.md §10, "Map pin": a 44px
 * fresco thumbnail with a 2px ink edge and a hard offset; your own frescoes get a yellow outline).
 *
 * The globe is the gallery, so the artwork has to be the thing you see on it. A generic marker
 * would make every fresco look the same and give no reason to tap one rather than another.
 */
import { supabase } from '../lib/supabase'
import type { GlobePoint } from './geoJson'

/** Published thumbnails live in the public bucket, so this needs no signing round trip. */
export function thumbUrl(path: string): string {
  return supabase.storage.from('globe').getPublicUrl(path).data.publicUrl
}

export function createFrescoPin(
  point: GlobePoint,
  { mine = false, onSelect }: { mine?: boolean; onSelect: (point: GlobePoint) => void },
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = mine ? 'pin pin-mine' : 'pin'
  button.setAttribute('aria-label', `${point.title}. Open this fresco.`)

  const image = document.createElement('img')
  image.src = thumbUrl(point.thumb_path)
  image.alt = ''
  image.loading = 'lazy'
  image.decoding = 'async'
  // A thumbnail that fails to load would otherwise show a broken-image glyph on the map; an empty
  // ink square still reads as a fresco waiting to be opened.
  image.addEventListener('error', () => image.remove())
  button.appendChild(image)

  button.addEventListener('click', (event) => {
    // Without this the click also reaches the map and closes the preview we are about to open.
    event.stopPropagation()
    onSelect(point)
  })

  return button
}
