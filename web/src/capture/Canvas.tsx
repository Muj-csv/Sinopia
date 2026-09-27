/** FR-001: draw a sketch directly on an in-browser canvas. */
import { useEffect, useRef } from 'react'

const WIDTH = 480
const HEIGHT = 640

function fillWhite(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
}

export function Canvas({ onImage }: { onImage: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    fillWhite(ctx)
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) * WIDTH) / rect.width,
      ((e.clientY - rect.top) * HEIGHT) / rect.height,
    ]
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const [x, y] = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const [x, y] = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stop = () => {
    drawing.current = false
  }

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) fillWhite(ctx)
  }

  const use = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob !== null) onImage(blob)
    }, 'image/png')
  }

  return (
    <div className="capture-canvas">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
      />
      <div className="capture-canvas-actions">
        <button type="button" onClick={clear}>
          Clear
        </button>
        <button type="button" onClick={use}>
          Use sketch
        </button>
      </div>
    </div>
  )
}
