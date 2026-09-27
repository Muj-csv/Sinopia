/**
 * Phase 0 task 7: drawing spike. Konva stage over a 1600px placeholder
 * photo, Perfect Freehand strokes, on-screen ms/segment counter so this
 * can be measured on a real phone (Chrome performance panel or this
 * counter) -- target <= 16ms/segment per PHASE-0.md acceptance.
 */
import { getStroke } from 'perfect-freehand'
import { useRef, useState } from 'react'
import { Layer, Line, Rect, Stage } from 'react-konva'

const PHOTO_WIDTH = 1600
const PHOTO_HEIGHT = 1200

interface Point {
  x: number
  y: number
}

function outlinePoints(points: Point[]): number[] {
  const stroke = getStroke(
    points.map((p) => [p.x, p.y]),
    { size: 6, thinning: 0.5, smoothing: 0.5, streamline: 0.5 },
  )
  return stroke.flat()
}

export function DrawSpike() {
  const [strokes, setStrokes] = useState<number[][]>([])
  const currentPoints = useRef<Point[]>([])
  const [current, setCurrent] = useState<number[]>([])
  const lastMoveAt = useRef<number | undefined>(undefined)
  const [avgMs, setAvgMs] = useState<number | undefined>(undefined)
  const samples = useRef<number[]>([])

  function handlePointerDown(e: { evt: PointerEvent }) {
    currentPoints.current = [{ x: e.evt.offsetX, y: e.evt.offsetY }]
    lastMoveAt.current = performance.now()
    samples.current = []
  }

  function handlePointerMove(e: { evt: PointerEvent }) {
    if (currentPoints.current.length === 0) return
    const now = performance.now()
    if (lastMoveAt.current !== undefined) {
      samples.current.push(now - lastMoveAt.current)
    }
    lastMoveAt.current = now

    currentPoints.current.push({ x: e.evt.offsetX, y: e.evt.offsetY })
    setCurrent(outlinePoints(currentPoints.current))
  }

  function handlePointerUp() {
    if (currentPoints.current.length > 1) {
      setStrokes((prev) => [...prev, outlinePoints(currentPoints.current)])
    }
    currentPoints.current = []
    setCurrent([])
    if (samples.current.length > 0) {
      const avg = samples.current.reduce((a, b) => a + b, 0) / samples.current.length
      setAvgMs(avg)
    }
  }

  return (
    <div className="draw-spike">
      <p className="draw-spike-readout">
        {avgMs !== undefined
          ? `Last stroke: ${avgMs.toFixed(1)} ms/segment (target <= 16 ms)`
          : 'Draw a stroke to measure latency.'}
      </p>
      <div className="draw-spike-stage">
        <Stage
          width={PHOTO_WIDTH}
          height={PHOTO_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Layer>
            {/* Photo layer placeholder -- a real photo comes in Phase 1's capture pipeline. */}
            <Rect x={0} y={0} width={PHOTO_WIDTH} height={PHOTO_HEIGHT} fill="#cfc9be" />
          </Layer>
          <Layer>
            {strokes.map((points, i) => (
              <Line key={i} points={points} closed fill="#1e1b18" />
            ))}
            {current.length > 0 && <Line points={current} closed fill="#1e1b18" />}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
