/**
 * The drawing surface over the space around the Sinopia (Update 1.2 §1), plus the small rail that
 * arms it.
 *
 * A raw 2D canvas rather than Konva, which the drawing screen uses. ARCHITECTURE.md §7 names Konva
 * and MapLibre as the two heaviest dependencies and splits them across chunks; this screen already
 * carries MapLibre, and a scene graph buys nothing for a flat list of strokes nobody selects or
 * transforms. Stroke geometry is still the app's own -- outlinePoints() and the brush table -- so
 * a pencil here tapers like a pencil on a fresco.
 *
 * The canvas only takes pointer events while drawing is armed. Otherwise every drag, pinch and
 * wheel belongs to the map, which is what stops a doodle happening when someone meant to spin the
 * world.
 */
import { useEffect, useRef, useState } from 'react'
import { BRUSHES, type BrushName } from '../draw/brushes'
import { PALETTE } from '../draw/palette'
import { outlinePoints, type Point } from '../draw/strokeHistory'
import { Icon } from '../ui/Icon'
import { useSpaceDrawing, type SpaceStroke } from './spaceDrawingContext'

const MIN_SIZE = 2
const MAX_SIZE = 24

/** Fills one stroke's perfect-freehand outline. */
function paintStroke(ctx: CanvasRenderingContext2D, stroke: SpaceStroke) {
  const outline = outlinePoints(stroke.points, stroke.size, stroke.tool)
  if (outline.length < 6) return
  const brush = BRUSHES[stroke.tool as BrushName]
  ctx.save()
  ctx.globalAlpha = brush?.opacity ?? 1
  ctx.fillStyle = stroke.color
  ctx.beginPath()
  ctx.moveTo(outline[0], outline[1])
  for (let i = 2; i < outline.length; i += 2) ctx.lineTo(outline[i], outline[i + 1])
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function SpaceLayer() {
  const { strokes, armed, color, size, tool, setArmed, setColor, setSize, addStroke, undo, clear } =
    useSpaceDrawing()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<Point[] | null>(null)
  // Kept in state as well as the ref so the in-progress stroke repaints as the hand moves.
  const [live, setLive] = useState<Point[] | null>(null)

  // Repaint everything whenever the committed strokes, the live stroke, or the size changes.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return

    const ratio = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    // Backing store in device pixels, drawing in CSS pixels: a stroke on a phone is otherwise
    // drawn at a third of its width and looks blurred.
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, width, height)

    for (const stroke of strokes) paintStroke(ctx, stroke)
    if (live !== null && live.length > 1) {
      paintStroke(ctx, { id: 'live', points: live, color, size, tool })
    }
  }, [strokes, live, color, size, tool])

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const finish = () => {
    const points = drawingRef.current
    drawingRef.current = null
    setLive(null)
    if (points === null || points.length < 2) return
    addStroke({ id: crypto.randomUUID(), points, color, size, tool })
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={armed ? 'space-layer armed' : 'space-layer'}
        // Decorative: the marks carry no information a reader needs read aloud.
        aria-hidden="true"
        onPointerDown={(e) => {
          if (!armed) return
          e.currentTarget.setPointerCapture(e.pointerId)
          const point = pointFrom(e)
          drawingRef.current = [point]
          setLive([point])
        }}
        onPointerMove={(e) => {
          if (!armed || drawingRef.current === null) return
          drawingRef.current = [...drawingRef.current, pointFrom(e)]
          setLive(drawingRef.current)
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />

      <div className="space-rail">
        <button
          type="button"
          className="ibtn"
          aria-pressed={armed}
          onClick={() => setArmed(!armed)}
          title={armed ? 'Stop drawing in the space' : 'Draw in the space'}
        >
          <Icon name="brush" label={armed ? 'Stop drawing in the space' : 'Draw in the space'} />
        </button>

        {armed && (
          <>
            <div className="space-colors" role="group" aria-label="Colour">
              {PALETTE.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  className="space-color"
                  style={{ background: swatch.value }}
                  aria-pressed={swatch.value === color}
                  onClick={() => setColor(swatch.value)}
                >
                  <span className="sr-only">{swatch.name}</span>
                </button>
              ))}
            </div>

            <label className="space-size">
              <span className="sr-only">Brush size</span>
              <input
                type="range"
                min={MIN_SIZE}
                max={MAX_SIZE}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>

            <button type="button" className="ibtn" onClick={undo} disabled={strokes.length === 0}>
              <Icon name="undo" label="Undo the last mark" />
            </button>
            <button type="button" className="ibtn" onClick={clear} disabled={strokes.length === 0}>
              <Icon name="trash" label="Clear every mark" />
            </button>
          </>
        )}
      </div>
    </>
  )
}
