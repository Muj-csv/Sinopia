/** Two-finger pinch-zoom + pan for the draw canvas (FR-004). Native touch events, not Konva's per-shape drag. */
import { useEffect, useRef, useState } from 'react'

export interface Viewport {
  scale: number
  x: number
  y: number
}

function distance(a: Touch, b: Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function midpoint(a: Touch, b: Touch): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

export function usePinchZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, x: 0, y: 0 })
  const gesture = useRef<{
    startDistance: number
    startScale: number
    startMid: { x: number; y: number }
    startOffset: { x: number; y: number }
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (el === null) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const [a, b] = [e.touches[0], e.touches[1]]
      setViewport((v) => {
        gesture.current = {
          startDistance: distance(a, b),
          startScale: v.scale,
          startMid: midpoint(a, b),
          startOffset: { x: v.x, y: v.y },
        }
        return v
      })
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || gesture.current === null) return
      e.preventDefault()
      const [a, b] = [e.touches[0], e.touches[1]]
      const g = gesture.current
      const scale = Math.min(4, Math.max(0.5, g.startScale * (distance(a, b) / g.startDistance)))
      const mid = midpoint(a, b)
      setViewport({
        scale,
        x: g.startOffset.x + (mid.x - g.startMid.x),
        y: g.startOffset.y + (mid.y - g.startMid.y),
      })
    }

    const onTouchEnd = () => {
      gesture.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [containerRef])

  return viewport
}
