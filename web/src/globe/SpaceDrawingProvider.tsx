/**
 * Holds the space marks for the life of the page. Mounted at the app root so the strokes survive
 * moving between the Sinopia, a fresco and the Sketchbook, and are lost on reload (Update 1.2 §1).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { ToolName } from '../draw/brushes'
import { PALETTE } from '../draw/palette'
import { SpaceDrawingContext, type SpaceStroke } from './spaceDrawingContext'

const DEFAULT_SIZE = 6

export function SpaceDrawingProvider({ children }: { children: ReactNode }) {
  const [strokes, setStrokes] = useState<SpaceStroke[]>([])
  const [armed, setArmed] = useState(false)
  const [color, setColor] = useState(PALETTE[0].value)
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [tool, setTool] = useState<ToolName>('pen')

  const addStroke = useCallback((stroke: SpaceStroke) => {
    setStrokes((current) => [...current, stroke])
  }, [])
  const undo = useCallback(() => setStrokes((current) => current.slice(0, -1)), [])
  const clear = useCallback(() => setStrokes([]), [])

  const value = useMemo(
    () => ({
      strokes,
      armed,
      color,
      size,
      tool,
      setArmed,
      setColor,
      setSize,
      setTool,
      addStroke,
      undo,
      clear,
    }),
    [strokes, armed, color, size, tool, addStroke, undo, clear],
  )

  return <SpaceDrawingContext.Provider value={value}>{children}</SpaceDrawingContext.Provider>
}
