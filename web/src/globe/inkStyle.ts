import type { Map as MapLibreMap } from 'maplibre-gl'

/**
 * Restyle an OpenFreeMap (OpenMapTiles-schema) style into the ink-on-paper look
 * (DESIGN_BRIEF.md §3 and correction #9): paper land, pale water, ink coasts, rule-coloured
 * boundaries. The map is app chrome, so it is drawn; only photos and frescoes are "real".
 *
 * Call once the style is ready: `map.on('style.load', () => applyInkStyle(map))`.
 * The attribution control stays visible at all times (NFR-004).
 */
export function applyInkStyle(map: MapLibreMap): void {
  const token = (name: string, fallback: string) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value === '' ? fallback : value
  }
  const paper = token('--paper', '#FFFFFF')
  const sea = token('--sea', '#E4ECF3')
  const ink = token('--ink', '#1A1A1A')
  const ink2 = token('--ink-2', '#55595E')
  const rule = token('--rule', '#CFDBE6')

  // Styles differ in which layers they ship, so every write is best-effort: a layer that isn't
  // there (or doesn't take the property) must not break the rest of the pass.
  // The property names below are valid for the layer types they're used with, but that pairing is
  // decided at runtime from the style, so it can't be expressed in setPaintProperty's key type.
  const paint = (id: string, property: string, value: unknown) => {
    try {
      ;(map.setPaintProperty as (i: string, p: string, v: unknown) => void)(id, property, value)
    } catch {
      /* layer absent in this style */
    }
  }

  for (const layer of map.getStyle().layers) {
    const id = layer.id
    const key = ('source-layer' in layer ? (layer['source-layer'] ?? '') : '') + id

    if (layer.type === 'background') {
      paint(id, 'background-color', paper)
    } else if (layer.type === 'fill') {
      if (/water|ocean|sea|lake/.test(key)) {
        paint(id, 'fill-color', sea)
        paint(id, 'fill-outline-color', ink)
      } else if (/building/.test(key)) {
        paint(id, 'fill-color', paper)
        paint(id, 'fill-outline-color', rule)
      } else {
        paint(id, 'fill-color', paper)
        paint(id, 'fill-opacity', 1)
      }
    } else if (layer.type === 'fill-extrusion') {
      // Extruded buildings read as 3D chrome, which fights the drawn-on-paper idea.
      try {
        map.setLayoutProperty(id, 'visibility', 'none')
      } catch {
        /* not hideable */
      }
    } else if (layer.type === 'line') {
      if (/water|coast/.test(key)) {
        paint(id, 'line-color', ink)
        paint(id, 'line-width', 1.2)
      } else if (/boundary|admin/.test(key)) {
        paint(id, 'line-color', rule)
      } else if (/transportation|road|street|highway|rail/.test(key)) {
        // Roads are drawn as an ink casing around a paper fill, so they read as outlined.
        paint(id, 'line-color', /casing/.test(id) ? ink : paper)
      } else {
        paint(id, 'line-color', rule)
      }
    } else if (layer.type === 'symbol') {
      // Labels keep the style's own glyph PBFs: MapLibre can't render the Google web fonts.
      paint(id, 'text-color', ink2)
      paint(id, 'text-halo-color', paper)
      paint(id, 'text-halo-width', 1.5)
      paint(id, 'icon-opacity', 0.6)
    }
  }
}
