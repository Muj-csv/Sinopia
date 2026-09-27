/**
 * Vector stroke history (PHASE-1 task 3, FR-004: undo/redo >= 50 steps).
 * Strokes are vector data (Perfect Freehand input points, not rendered
 * outlines or raster snapshots) -- undo/redo is just moving a pointer
 * through this array, so it's cheap regardless of history depth. A
 * "clear layer" is its own history entry (undoable), not a destructive
 * splice.
 */

import { getStroke } from 'perfect-freehand'

export interface Point {
  x: number
  y: number
}

/** Perfect-Freehand outline for a stroke's raw input points, flattened for Konva's Line `points`. */
export function outlinePoints(points: Point[], size: number): number[] {
  const stroke = getStroke(
    points.map((p) => [p.x, p.y]),
    { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5 },
  )
  return stroke.flat()
}

export interface BrushStroke {
  type: 'stroke'
  id: string
  layerIndex: number
  tool: 'brush' | 'eraser'
  points: Point[]
  color: string
  size: number
  opacity: number
}

export interface ClearLayer {
  type: 'clear'
  id: string
  layerIndex: number
}

export type HistoryEntry = BrushStroke | ClearLayer

export interface History {
  entries: HistoryEntry[]
  /** Number of entries currently applied, 0..entries.length. */
  index: number
}

export const LAYER_COUNT = 3

export function emptyHistory(): History {
  return { entries: [], index: 0 }
}

/** Appends an entry, discarding any redo tail (standard undo-stack behavior). */
export function pushEntry(history: History, entry: HistoryEntry): History {
  const entries = [...history.entries.slice(0, history.index), entry]
  return { entries, index: entries.length }
}

export function canUndo(history: History): boolean {
  return history.index > 0
}

export function canRedo(history: History): boolean {
  return history.index < history.entries.length
}

export function undo(history: History): History {
  return canUndo(history) ? { ...history, index: history.index - 1 } : history
}

export function redo(history: History): History {
  return canRedo(history) ? { ...history, index: history.index + 1 } : history
}

/**
 * Strokes currently visible on one layer: everything on that layer after
 * its most recent 'clear', up to the current history index.
 */
export function visibleStrokes(history: History, layerIndex: number): BrushStroke[] {
  const applied = history.entries.slice(0, history.index)
  let lastClear = -1
  for (let i = 0; i < applied.length; i++) {
    const e = applied[i]
    if (e.layerIndex === layerIndex && e.type === 'clear') lastClear = i
  }
  return applied
    .slice(lastClear + 1)
    .filter((e): e is BrushStroke => e.type === 'stroke' && e.layerIndex === layerIndex)
}

/** "Finish enabled once >= 1 stroke" (UX_MAP.md) -- counts currently-visible strokes only. */
export function hasAnyStroke(history: History): boolean {
  for (let layerIndex = 0; layerIndex < LAYER_COUNT; layerIndex++) {
    if (visibleStrokes(history, layerIndex).length > 0) return true
  }
  return false
}
