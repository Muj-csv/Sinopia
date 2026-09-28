/**
 * Vector stroke history (PHASE-1 task 3, FR-004: undo/redo >= 50 steps).
 * Strokes are vector data (Perfect Freehand input points, not rendered
 * outlines or raster snapshots) -- undo/redo is just moving a pointer
 * through this array, so it's cheap regardless of history depth. A
 * "clear layer" is its own history entry (undoable), not a destructive
 * splice.
 */

import { getStroke } from 'perfect-freehand'
import { strokeOptions, strokeWidth, type ToolName } from './brushes'

export interface Point {
  x: number
  y: number
}

/**
 * Perfect-Freehand outline for a stroke's raw input points, flattened for Konva's Line `points`.
 * The brush decides how the line tapers, so the same gesture reads as pencil, pen or marker.
 */
export function outlinePoints(points: Point[], size: number, tool: ToolName = 'pen'): number[] {
  const stroke = getStroke(
    points.map((p) => [p.x, p.y]),
    { size: strokeWidth(tool, size), ...strokeOptions(tool) },
  )
  return stroke.flat()
}

export interface BrushStroke {
  type: 'stroke'
  id: string
  layerIndex: number
  tool: ToolName
  points: Point[]
  color: string
  size: number
  opacity: number
}

/**
 * Drafts saved before brush types existed recorded `tool: 'brush'`. They live in the artist's
 * IndexedDB, so they have to keep opening: the old single brush was an even, opaque line, which
 * is the pen.
 */
export function migrateHistory(history: History): History {
  let changed = false
  const entries = history.entries.map((entry) => {
    if (entry.type !== 'stroke') return entry
    const tool = entry.tool as ToolName | 'brush'
    if (tool !== 'brush') return entry
    changed = true
    return { ...entry, tool: 'pen' as const }
  })
  return changed ? { ...history, entries } : history
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
