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
 * Once a mark is finished it drifts and bounces off the edges, like a screensaver, for as long as
 * the screen stays open (gone on reload, same as every mark here already was). Its perfect-freehand
 * outline is computed exactly once, into a Path2D, at the moment the stroke finishes -- animating
 * it afterwards is just translating that already-built shape, never recomputing the geometry. That
 * matters more here than it would elsewhere: with marks drifting continuously, the canvas repaints
 * every frame for as long as any exist, not just while a hand is moving.
 */
import { useEffect, useRef, useState } from 'react'
import { BRUSHES, isBrush, type BrushName } from '../draw/brushes'
import { PALETTE } from '../draw/palette'
import { outlinePoints, type Point } from '../draw/strokeHistory'
import { Icon } from '../ui/Icon'
import { useSpaceDrawing, type SpaceStroke } from './spaceDrawingContext'

const MIN_SIZE = 2
const MAX_SIZE = 24
/** CSS px/second. Gentle -- a screensaver drift, not something darting around underfoot. */
const MIN_SPEED = 18
const MAX_SPEED = 40
/**
 * A new point is only recorded once the hand has moved at least this far from the last one (CSS
 * px). perfect-freehand's outline cost scales with point *count*, and without this a fast or
 * high-poll-rate input device can pile up hundreds of points in a couple of seconds even though
 * the hand barely moved between most of them -- that's what made the brush feel laggier the
 * longer a stroke went on. 2px is well under what the eye can resolve as a missing waypoint once
 * perfect-freehand smooths the curve, but cuts point count by an order of magnitude or more.
 */
const MIN_POINT_DIST = 2
const MIN_POINT_DIST_SQ = MIN_POINT_DIST * MIN_POINT_DIST

interface Geometry {
  path: Path2D
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

interface FloatingStroke extends Geometry {
  color: string
  tool: SpaceStroke['tool']
  opacity: number
  pos: { x: number; y: number }
  vel: { x: number; y: number }
}

/** A perfect-freehand outline, built into a reusable Path2D exactly once, plus its bounds. */
function buildGeometry(outline: number[]): Geometry | null {
  if (outline.length < 6) return null
  const path = new Path2D()
  path.moveTo(outline[0], outline[1])
  let minX = outline[0]
  let maxX = outline[0]
  let minY = outline[1]
  let maxY = outline[1]
  for (let i = 2; i < outline.length; i += 2) {
    const x = outline[i]
    const y = outline[i + 1]
    path.lineTo(x, y)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  path.closePath()
  return { path, bounds: { minX, minY, maxX, maxY } }
}

/** A finished stroke's outline, plus its bounds and a random drift -- built once, at finish time. */
function toFloatingStroke(stroke: SpaceStroke): FloatingStroke | null {
  const geometry = buildGeometry(outlinePoints(stroke.points, stroke.size, stroke.tool))
  if (geometry === null) return null

  const brush = isBrush(stroke.tool) ? BRUSHES[stroke.tool as BrushName] : undefined
  const angle = Math.random() * Math.PI * 2
  const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
  return {
    ...geometry,
    color: stroke.color,
    tool: stroke.tool,
    opacity: brush?.opacity ?? 1,
    pos: { x: 0, y: 0 },
    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
  }
}

export function SpaceLayer() {
  const {
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
  } = useSpaceDrawing()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ratioRef = useRef(1)
  const sizeRef = useRef({ width: 0, height: 0 })
  /** Finished strokes only, keyed by id -- built once each, animated every frame. */
  const floatingRef = useRef(new Map<string, FloatingStroke>())
  const [reduceMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  const drawingRef = useRef<Point[] | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  /** The live stroke's colour/size/tool, read by the paint loop without waiting on React. */
  const liveStyleRef = useRef({ color, size, tool })
  /**
   * The in-progress stroke's outline, rebuilt only when its point count has actually changed since
   * the last frame. The animation loop redraws every frame regardless (for the floating marks), but
   * recomputing perfect-freehand's curve that often for a hand that's moved less than MIN_POINT_DIST
   * since the last frame was pure waste -- this is what made drawing feel like it had a growing lag
   * the longer a stroke went on, on top of the point-count growth above.
   */
  const liveGeometryRef = useRef<Geometry | null>(null)
  const liveLengthRef = useRef(0)

  useEffect(() => {
    liveStyleRef.current = { color, size, tool }
  }, [color, size, tool])

  const redraw = () => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    const ratio = ratioRef.current

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const f of floatingRef.current.values()) {
      ctx.setTransform(ratio, 0, 0, ratio, f.pos.x * ratio, f.pos.y * ratio)
      ctx.globalCompositeOperation = f.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.globalAlpha = f.opacity
      ctx.fillStyle = f.color
      ctx.fill(f.path)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    const live = drawingRef.current
    if (live !== null && live.length > 1) {
      if (live.length !== liveLengthRef.current) {
        const { size: s, tool: t } = liveStyleRef.current
        liveGeometryRef.current = buildGeometry(outlinePoints(live, s, t))
        liveLengthRef.current = live.length
      }
      if (liveGeometryRef.current !== null) {
        const { color: c, tool: t } = liveStyleRef.current
        const brush = isBrush(t) ? BRUSHES[t as BrushName] : undefined
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
        ctx.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over'
        ctx.globalAlpha = brush?.opacity ?? 1
        ctx.fillStyle = c
        ctx.fill(liveGeometryRef.current.path)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }
    }
  }

  /** Runs while a hand is moving and/or anything is drifting; stops itself once neither applies. */
  const ensureLoop = () => {
    if (rafRef.current !== null) return
    lastFrameRef.current = null
    const step = (now: number) => {
      const dt = lastFrameRef.current === null ? 0 : (now - lastFrameRef.current) / 1000
      lastFrameRef.current = now

      if (!reduceMotion && dt > 0) {
        const { width, height } = sizeRef.current
        for (const f of floatingRef.current.values()) {
          f.pos.x += f.vel.x * dt
          f.pos.y += f.vel.y * dt
          const left = f.bounds.minX + f.pos.x
          const right = f.bounds.maxX + f.pos.x
          const top = f.bounds.minY + f.pos.y
          const bottom = f.bounds.maxY + f.pos.y
          if (left < 0) {
            f.pos.x -= left
            f.vel.x = Math.abs(f.vel.x)
          } else if (right > width) {
            f.pos.x -= right - width
            f.vel.x = -Math.abs(f.vel.x)
          }
          if (top < 0) {
            f.pos.y -= top
            f.vel.y = Math.abs(f.vel.y)
          } else if (bottom > height) {
            f.pos.y -= bottom - height
            f.vel.y = -Math.abs(f.vel.y)
          }
        }
      }

      redraw()

      const stillDrawing = drawingRef.current !== null
      const stillDrifting = !reduceMotion && floatingRef.current.size > 0
      if (stillDrawing || stillDrifting) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Sizes the canvas to its container. Only on mount and on resize -- never mid-frame, since
  // setting canvas.width/height clears and reallocates the whole backing store.
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      ratioRef.current = ratio
      sizeRef.current = { width, height }
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      redraw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // The committed-stroke list changed: add geometry for anything new, drop anything gone (undo,
  // clear), and kick the animation loop off again if a fresh mark needs to start drifting.
  useEffect(() => {
    const known = floatingRef.current
    const currentIds = new Set(strokes.map((s) => s.id))
    for (const id of known.keys()) {
      if (!currentIds.has(id)) known.delete(id)
    }
    for (const stroke of strokes) {
      if (known.has(stroke.id)) continue
      const built = toFloatingStroke(stroke)
      if (built !== null) known.set(stroke.id, built)
    }
    redraw()
    ensureLoop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const finish = () => {
    const points = drawingRef.current
    drawingRef.current = null
    liveGeometryRef.current = null
    liveLengthRef.current = 0
    if (points === null || points.length < 2) {
      redraw()
      return
    }
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
          drawingRef.current = [pointFrom(e)]
          liveGeometryRef.current = null
          liveLengthRef.current = 0
          ensureLoop()
        }}
        onPointerMove={(e) => {
          const drawing = drawingRef.current
          if (!armed || drawing === null) return
          // getCoalescedEvents() recovers every hardware sample behind this one dispatched event --
          // without it, a fast stroke on a high-poll-rate touchscreen or stylus can visibly skip
          // corners, because the browser only dispatches one pointermove per animation frame no
          // matter how many raw samples the device produced in between.
          const native = e.nativeEvent
          const samples =
            typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
          const rect = e.currentTarget.getBoundingClientRect()
          for (const sample of samples.length > 0 ? samples : [native]) {
            const next = { x: sample.clientX - rect.left, y: sample.clientY - rect.top }
            const last = drawing[drawing.length - 1]
            const dx = next.x - last.x
            const dy = next.y - last.y
            // Distance-gated, not one-per-sample: most of those coalesced samples are still well
            // under MIN_POINT_DIST apart on typical hand movement, and recording all of them anyway
            // is exactly the unbounded point growth that caused the lag in the first place.
            if (dx * dx + dy * dy >= MIN_POINT_DIST_SQ) drawing.push(next)
          }
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
            <div className="space-tools" role="group" aria-label="Draw or erase">
              <button
                type="button"
                className="ibtn"
                aria-pressed={tool !== 'eraser'}
                onClick={() => setTool('pen')}
                title="Draw"
              >
                <Icon name="brush" label="Draw" />
              </button>
              <button
                type="button"
                className="ibtn"
                aria-pressed={tool === 'eraser'}
                onClick={() => setTool('eraser')}
                title="Erase"
              >
                <Icon name="eraser" label="Erase" />
              </button>
            </div>

            {tool !== 'eraser' && (
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
            )}

            <label className="space-size">
              <span className="sr-only">{tool === 'eraser' ? 'Eraser size' : 'Brush size'}</span>
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
