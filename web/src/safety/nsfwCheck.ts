/**
 * PHASE-5a task 2 (FR-016): lazy-loaded nsfwjs check before publish. The
 * classification-interpretation logic is pure and tested; loading the
 * TensorFlow.js model and running it against a real image needs a real
 * browser + WebGL backend, so that part is verified manually, not here.
 */
export interface Prediction {
  className: string
  probability: number
}

export interface NsfwResult {
  flagged: boolean
  reason?: string
}

const FLAGGED_CLASSES = ['Porn', 'Hentai', 'Sexy']
const FLAG_THRESHOLD = 0.6

export function interpretPredictions(predictions: readonly Prediction[]): NsfwResult {
  const worst = predictions.find(
    (p) => FLAGGED_CLASSES.includes(p.className) && p.probability >= FLAG_THRESHOLD,
  )
  if (worst === undefined) return { flagged: false }
  return {
    flagged: true,
    reason: `This image was flagged as ${worst.className.toLowerCase()} (${Math.round(worst.probability * 100)}% confidence). Publishing is blocked.`,
  }
}

let modelPromise: ReturnType<typeof loadNsfwModel> | null = null

/**
 * `import('nsfwjs')`'s default entry statically imports all 3 of its
 * bundled models (MobileNetV2, MobileNetV2Mid, InceptionV3) unconditionally
 * -- tens of MB combined, confirmed via a failed production build (workbox
 * precache rejected files over its 2MB limit). The package's own `exports`
 * map exposes `nsfwjs/core` + `nsfwjs/models/mobilenet_v2_mid` specifically
 * so callers can load just the one (smallest) model they actually use.
 */
async function loadNsfwModel() {
  const [{ load }, { MobileNetV2MidModel }] = await Promise.all([
    import('nsfwjs/core'),
    import('nsfwjs/models/mobilenet_v2_mid'),
  ])
  return load(MobileNetV2MidModel.name, { modelDefinitions: [MobileNetV2MidModel] })
}

function getModel() {
  modelPromise ??= loadNsfwModel()
  return modelPromise
}

export async function checkImageSafety(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<NsfwResult> {
  try {
    const model = await getModel()
    const predictions = await model.classify(image)
    return interpretPredictions(predictions)
  } catch {
    // Model failed to load/run (e.g. no WebGL) -- fail open rather than
    // blocking every publish on an infrastructure problem.
    return { flagged: false }
  }
}
