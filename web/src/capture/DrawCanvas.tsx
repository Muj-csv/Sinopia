import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { type CapturedImage, loadImage } from './types'

interface Props {
  onCapture: (image: CapturedImage) => void
}

const CANVAS_SIZE = 512
const STROKE_STYLE = '#1a1a1a'
const STROKE_WIDTH = 4

export function DrawCanvas({ onCapture }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(false)

  function getCtx(): CanvasRenderingContext2D | undefined {
    const canvas = canvasRef.current
    return canvas?.getContext('2d') ?? undefined
  }

  useEffect(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  function point(e: ReactPointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = getCtx()
    if (!ctx) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const [x, y] = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = STROKE_STYLE
    ctx.lineWidth = STROKE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = getCtx()
    if (!ctx) return
    const [x, y] = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStrokes(true)
  }

  function handlePointerUp() {
    drawing.current = false
  }

  function handleClear() {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  function handleDone() {
    const canvas = canvasRef.current
    if (!canvas) return
    loadImage(canvas.toDataURL('image/png')).then(onCapture)
  }

  return (
    <div className="capture-panel">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="capture-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="img"
        aria-label="Drawing canvas"
      />
      <div className="capture-controls">
        <button type="button" onClick={handleClear}>
          Clear
        </button>
        <button type="button" onClick={handleDone} disabled={!hasStrokes}>
          Use this drawing
        </button>
      </div>
    </div>
  )
}
