/**
 * Brush definitions. Sinopia is a sketching tool, not a painting application, so this is three
 * marks that feel different under the hand plus an eraser -- not a brush engine.
 *
 * Each brush is a set of perfect-freehand parameters and an opacity, so the difference between a
 * pencil and a marker is how the stroke tapers and how much it covers, not a different code path.
 */
export type BrushName = 'pencil' | 'pen' | 'marker'
export type ToolName = BrushName | 'eraser'

export interface BrushSpec {
  name: BrushName
  label: string
  /** Multiplies the chosen size, so switching brush keeps the artist's size setting meaningful. */
  sizeScale: number
  opacity: number
  /** perfect-freehand: how much the stroke narrows with speed. Higher reads as more hand-drawn. */
  thinning: number
  smoothing: number
  streamline: number
}

export const BRUSHES: Record<BrushName, BrushSpec> = {
  // Thin, tapered, and semi-transparent so overlapping strokes build up like graphite.
  pencil: {
    name: 'pencil',
    label: 'Pencil',
    sizeScale: 0.6,
    opacity: 0.75,
    thinning: 0.65,
    smoothing: 0.4,
    streamline: 0.4,
  },
  // Even width and fully opaque: the confident line you commit with.
  pen: {
    name: 'pen',
    label: 'Pen',
    sizeScale: 1,
    opacity: 1,
    thinning: 0.2,
    smoothing: 0.5,
    streamline: 0.5,
  },
  // Broad and slightly translucent, for blocking in shapes.
  marker: {
    name: 'marker',
    label: 'Marker',
    sizeScale: 2.2,
    opacity: 0.55,
    thinning: 0,
    smoothing: 0.6,
    streamline: 0.6,
  },
}

export const BRUSH_ORDER: BrushName[] = ['pencil', 'pen', 'marker']

export const DEFAULT_BRUSH: BrushName = 'pen'

export function isBrush(tool: ToolName): tool is BrushName {
  return tool !== 'eraser'
}

/** Sizes are a short, named scale rather than a raw pixel slider: three choices, not sixty-four. */
export const SIZES = [
  { label: 'Small', value: 4 },
  { label: 'Medium', value: 10 },
  { label: 'Large', value: 22 },
] as const

export const DEFAULT_SIZE = 10

/**
 * The width actually drawn. The eraser ignores brush scaling so its size means what it says --
 * an eraser that silently rubbed out 2.2x its indicated width would be unusable.
 */
export function strokeWidth(tool: ToolName, size: number): number {
  return isBrush(tool) ? size * BRUSHES[tool].sizeScale : size
}

/** perfect-freehand options for a tool. The eraser borrows the pen's even, predictable edge. */
export function strokeOptions(
  tool: ToolName,
): Pick<BrushSpec, 'thinning' | 'smoothing' | 'streamline'> {
  const spec = isBrush(tool) ? BRUSHES[tool] : BRUSHES.pen
  return { thinning: spec.thinning, smoothing: spec.smoothing, streamline: spec.streamline }
}
