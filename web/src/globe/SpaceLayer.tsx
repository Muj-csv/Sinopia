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
 *
 * Committed strokes live on an offscreen cache canvas, repainted only when the stroke list itself
 * changes (finish a stroke, undo, clear -- all rare). The hand actually moving draws straight to
 * the visible canvas via requestAnimationFrame, skipping React state entirely: the first version
 * ran the *entire* repaint -- every past stroke, plus a canvas resize, which clears and
 * reallocates the whole backing store -- on every single pointer-move event, so the page got
 * slower to draw on the more you'd already drawn, and could lock the tab up on a longer stroke.
 */
import { useEffect, useRef } from 'react'
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
  /** Committed strokes only. Redrawn far less often than the visible canvas repaints. */
  const cacheRef = useRef<HTMLCanvasElement | null>(null)
  const ratioRef = useRef(1)
  const strokesRef = useRef<SpaceStroke[]>(strokes)
  const drawingRef = useRef<Point[] | null>(null)
  const rafRef = useRef<number | null>(null)
  /** The live stroke's colour/size/tool, read by the rAF paint loop without waiting on React. */
  const liveStyleRef = useRef({ color, size, tool })

  useEffect(() => {
    strokesRef.current = strokes
    liveStyleRef.current = { color, size, tool }
  }, [strokes, color, size, tool])

  const repaintCache = () => {
    const cache = cacheRef.current
    if (cache === null) return
    const ctx = cache.getContext('2d')
    if (ctx === null) return
    ctx.setTransform(ratioRef.current, 0, 0, ratioRef.current, 0, 0)
    ctx.clearRect(0, 0, cache.width, cache.height)
    for (const stroke of strokesRef.current) paintStroke(ctx, stroke)
  }

  /** Visible canvas = the committed cache, plus whatever's mid-stroke right now (if anything). */
  const repaintVisible = (live: Point[] | null) => {
    const canvas = canvasRef.current
    const cache = cacheRef.current
    if (canvas === null || cache === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(cache, 0, 0)
    if (live !== null && live.length > 1) {
      const { color: c, size: s, tool: t } = liveStyleRef.current
      ctx.setTransform(ratioRef.current, 0, 0, ratioRef.current, 0, 0)
      paintStroke(ctx, { id: 'live', points: live, color: c, size: s, tool: t })
    }
  }

  // Sizes both canvases to the container. Only on mount and on resize -- never while drawing,
  // since setting canvas.width/height clears and reallocates the whole backing store.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    if (cacheRef.current === null) cacheRef.current = document.createElement('canvas')
    const cache = cacheRef.current

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      ratioRef.current = ratio
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      cache.width = canvas.width
      cache.height = canvas.height
      repaintCache()
      repaintVisible(drawingRef.current)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
    // Deliberately mount-only otherwise: repaintCache/repaintVisible read the current values via
    // refs, so this doesn't need strokes/color/size/tool as dependencies.
  }, [])

  // Committed strokes changed (a stroke finished, undo, or clear) -- repaint the cache, and the
  // visible canvas from it. Rare compared to a pointer moving, so redrawing everything is fine.
  useEffect(() => {
    repaintCache()
    repaintVisible(drawingRef.current)
  }, [strokes])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const scheduleRepaint = () => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      repaintVisible(drawingRef.current)
    })
  }

  const finish = () => {
    const points = drawingRef.current
    drawingRef.current = null
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    repaintVisible(null)
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
          scheduleRepaint()
        }}
        onPointerMove={(e) => {
          if (!armed || drawingRef.current === null) return
          drawingRef.current.push(pointFrom(e))
          scheduleRepaint()
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
