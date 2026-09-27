/**
 * PHASE-1 task 3: Konva stage -- photo on a locked layer + LAYER_COUNT
 * drawing layers, Perfect Freehand strokes, eraser via
 * globalCompositeOperation="destination-out" (only affects its own
 * layer's canvas, never the photo). Pinch-zoom/pan via usePinchZoom.
 */
import type Konva from 'konva'
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

export interface Tool {
  name: 'brush' | 'eraser'
  color: string
  size: number
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
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null)
  const currentPoints = useRef<Point[]>([])
  const [currentOutline, setCurrentOutline] = useState<number[]>([])
  const drawing = useRef(false)
  const viewport = usePinchZoom(containerRef)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setPhotoImage(img)
    img.src = photoUrl
    return () => {
      img.onload = null
    }
  }, [photoUrl])

  const handlePointerDown = (e: { evt: PointerEvent }) => {
    drawing.current = true
    currentPoints.current = [{ x: e.evt.offsetX, y: e.evt.offsetY }]
    setCurrentOutline(outlinePoints(currentPoints.current, tool.size))
  }

  const handlePointerMove = (e: { evt: PointerEvent }) => {
    if (!drawing.current) return
    currentPoints.current.push({ x: e.evt.offsetX, y: e.evt.offsetY })
    setCurrentOutline(outlinePoints(currentPoints.current, tool.size))
  }

  const handlePointerUp = () => {
    if (!drawing.current) return
    drawing.current = false
    if (currentPoints.current.length > 1) onStrokeComplete(currentPoints.current)
    currentPoints.current = []
    setCurrentOutline([])
  }

  return (
    <div ref={containerRef} className="draw-canvas-container">
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
                points={outlinePoints(stroke.points, stroke.size)}
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
