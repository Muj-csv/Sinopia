/**
 * Marks the artist leaves in the space around their Sinopia (Update 1.2 §1).
 *
 * These are not frescoes. A fresco is photo + drawing + place + time and lives in the database;
 * these are doodles, constellations and notes floating around your world, and they are gone when
 * you reload. That is deliberate, and it is why they live in React state rather than IndexedDB or
 * Postgres: in-memory context survives navigating between routes and dies with the page, which is
 * exactly the lifetime the spec asks for. `sessionStorage` would be the obvious reach and the
 * wrong one -- it survives a reload.
 *
 * They are kept in screen space rather than pinned to coordinates: they surround the world, they
 * are not drawn on it. Marks on the Earth itself are what frescoes are for.
 */
import { createContext, useContext } from 'react'
import type { ToolName } from '../draw/brushes'
import type { Point } from '../draw/strokeHistory'

export interface SpaceStroke {
  id: string
  points: Point[]
  color: string
  size: number
  tool: ToolName
}

export interface SpaceDrawing {
  strokes: SpaceStroke[]
  /** True while the canvas is taking pointer events, so the map keeps its own gestures. */
  armed: boolean
  color: string
  size: number
  tool: ToolName
  setArmed: (armed: boolean) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
  setTool: (tool: ToolName) => void
  addStroke: (stroke: SpaceStroke) => void
  undo: () => void
  clear: () => void
}

export const SpaceDrawingContext = createContext<SpaceDrawing | null>(null)

export function useSpaceDrawing(): SpaceDrawing {
  const value = useContext(SpaceDrawingContext)
  if (value === null) {
    throw new Error('useSpaceDrawing must be used inside <SpaceDrawingProvider>')
  }
  return value
}
