/**
 * PHASE-1 task 5: export the finished drawing -- transparent WebP of just
 * the drawing layers, and a composite WebP of photo + drawing. Both go
 * through the same size/quality budget as images.ts (ARCHITECTURE.md §7).
 */
import type Konva from 'konva'
import { PHOTO_QUALITY } from '../lib/images'

export interface FrescoExport {
  drawing: Blob
  composite: Blob
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob !== null ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/webp',
      quality,
    )
  })
}

/** Toggles the named layer's visibility for the duration of `fn`, then restores it. */
function withLayerHidden<T>(stage: Konva.Stage, layerName: string, fn: () => T): T {
  const layer = stage.findOne(`.${layerName}`)
  const wasVisible = layer?.visible() ?? true
  layer?.visible(false)
  stage.batchDraw()
  try {
    return fn()
  } finally {
    layer?.visible(wasVisible)
    stage.batchDraw()
  }
}

export async function exportFresco(stage: Konva.Stage): Promise<FrescoExport> {
  const drawingCanvas = withLayerHidden(stage, 'photo-layer', () =>
    stage.toCanvas({ pixelRatio: 1 }),
  )
  const compositeCanvas = stage.toCanvas({ pixelRatio: 1 })

  const [drawing, composite] = await Promise.all([
    canvasToBlob(drawingCanvas, PHOTO_QUALITY),
    canvasToBlob(compositeCanvas, PHOTO_QUALITY),
  ])
  return { drawing, composite }
}
