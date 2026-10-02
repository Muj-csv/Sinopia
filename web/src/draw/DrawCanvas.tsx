/**
 * PHASE-1 task 3: Konva stage -- photo on a locked layer + LAYER_COUNT
 * drawing layers, Perfect Freehand strokes, eraser via
 * globalCompositeOperation="destination-out" (only affects its own
 * layer's canvas, never the photo). Pinch-zoom/pan via usePinchZoom.
 */
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva'
import {
  LAYER_COUNT,
  outlinePoints,
  visibleStrokes,
  type History,
  type Point,
} from './strokeHistory'
import { usePinchZoom } from './usePinchZoom'
import type { ToolName } from './brushes'

export interface Tool {
  name: ToolName
  color: string
  size: number
  /** The brush sets this; a custom value still wins so the Colour popover can dial it down. */
  opacity: number
}

export function DrawCanvas({
  photoUrl,
  width,
  height,
  history,
  activeLayer,
  layerVisible,
  tool,
  onStrokeComplete,
  stageRef,
  eyedropperArmed = false,
  onPickColor,
}: {
  photoUrl: string
  width: number
  height: number
  history: History
  activeLayer: number
  layerVisible: boolean[]
  tool: Tool
  onStrokeComplete: (points: Point[]) => void
  stageRef?: React.RefObject<Konva.Stage | null>
  /** Armed by the Colour popover's "Pick from photo" (DESIGN_BRIEF.md: "an eyedropper that picks
   *  colors from the photo"). While armed, a tap samples the photo instead of drawing a stroke. */
  eyedropperArmed?: boolean
  onPickColor?: (hex: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null)
  const currentPoints = useRef<Point[]>([])
  const [currentOutline, setCurrentOutline] = useState<number[]>([])
  /** The pointer that owns the stroke in progress; null when not drawing. */
  const activePointer = useRef<number | null>(null)
  const viewport = usePinchZoom(containerRef)
  /** The photo redrawn at the draft's own size, so a stage point maps straight onto a pixel --
   *  rebuilt only when the photo or the draft's dimensions change, never on every tap. */
  const photoSampleCanvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setPhotoImage(img)
    img.src = photoUrl
    return () => {
      img.onload = null
    }
  }, [photoUrl])

  useEffect(() => {
    if (photoImage === null) return
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(photoImage, 0, 0, width, height)
    photoSampleCanvas.current = canvas
  }, [photoImage, width, height])

  /** The photo's colour under a stage point -- the real wall or sky, never a drawn stroke. */
  const sampleColor = (point: Point): string | null => {
    const canvas = photoSampleCanvas.current
    if (canvas === null) return null
    const x = Math.min(Math.max(Math.round(point.x), 0), canvas.width - 1)
    const y = Math.min(Math.max(Math.round(point.y), 0), canvas.height - 1)
    const pixel = canvas.getContext('2d')?.getImageData(x, y, 1, 1).data
    if (pixel === undefined) return null
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`.toUpperCase()
  }

  /**
   * Pointer position in STAGE coordinates. `evt.offsetX/Y` is in element space, which only agrees
   * with the stage once it is unpanned and unzoomed -- after a pinch, strokes landed away from the
   * finger. getRelativePointerPosition applies the stage transform.
   */
  const stagePoint = (e: KonvaEventObject<PointerEvent>): Point | null => {
    const position = e.target.getStage()?.getRelativePointerPosition()
    return position === null || position === undefined ? null : { x: position.x, y: position.y }
  }

  const abortStroke = () => {
    activePointer.current = null
    currentPoints.current = []
    setCurrentOutline([])
  }

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (eyedropperArmed) {
      const point = stagePoint(e)
      const hex = point === null ? null : sampleColor(point)
      if (hex !== null) onPickColor?.(hex)
      return
    }
    // A second finger means a pinch, not a stroke: drop what was drawn so the gesture that zooms
    // the canvas does not also leave a mark on it.
    if (activePointer.current !== null) {
      abortStroke()
      return
    }
    const point = stagePoint(e)
    if (point === null) return

    activePointer.current = e.evt.pointerId
    // Capture keeps move/up coming to this element even if the finger leaves it, so releasing
    // outside the canvas still ends the stroke instead of leaving it stuck open.
    if (e.evt.target instanceof Element && e.evt.target.hasPointerCapture !== undefined) {
      try {
        e.evt.target.setPointerCapture(e.evt.pointerId)
      } catch {
        /* capture is best-effort */
      }
    }
    currentPoints.current = [point]
    setCurrentOutline(outlinePoints(currentPoints.current, tool.size, tool.name))
  }

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (activePointer.current !== e.evt.pointerId) return
    const point = stagePoint(e)
    if (point === null) return
    currentPoints.current.push(point)
    setCurrentOutline(outlinePoints(currentPoints.current, tool.size, tool.name))
  }

  const handlePointerUp = (e: KonvaEventObject<PointerEvent>) => {
    if (activePointer.current !== e.evt.pointerId) return
    activePointer.current = null
    if (currentPoints.current.length > 1) onStrokeComplete(currentPoints.current)
    currentPoints.current = []
    setCurrentOutline([])
  }

  /** The OS took the pointer (system gesture, call, palm rejection). Discard, never commit. */
  const handlePointerCancel = (e: KonvaEventObject<PointerEvent>) => {
    if (activePointer.current !== e.evt.pointerId) return
    abortStroke()
  }

  return (
    <div
      ref={containerRef}
      className={
        eyedropperArmed ? 'draw-canvas-container eyedropper-armed' : 'draw-canvas-container'
      }
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.x}
        y={viewport.y}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <Layer name="photo-layer" listening={false}>
          {photoImage !== null ? (
            <KonvaImage image={photoImage} width={width} height={height} />
          ) : (
            <Rect x={0} y={0} width={width} height={height} fill="#cfc9be" />
          )}
        </Layer>

        {Array.from({ length: LAYER_COUNT }, (_, layerIndex) => (
          <Layer key={layerIndex} visible={layerVisible[layerIndex] ?? true}>
            {visibleStrokes(history, layerIndex).map((stroke) => (
              <Line
                key={stroke.id}
                points={outlinePoints(stroke.points, stroke.size, stroke.tool)}
                closed
                fill={stroke.color}
                opacity={stroke.opacity}
                globalCompositeOperation={
                  stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
            {layerIndex === activeLayer && currentOutline.length > 0 && (
              <Line
                points={currentOutline}
                closed
                fill={tool.color}
                opacity={tool.opacity}
                globalCompositeOperation={
                  tool.name === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            )}
          </Layer>
        ))}
      </Stage>
    </div>
  )
}
