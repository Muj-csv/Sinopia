/**
 * "Looks like..." chips in the reference panel: a small CNN, entirely on-device, guesses what the
 * current drawing looks like and offers the guesses as one-tap searches. Lazy-loaded exactly like
 * nsfwCheck.ts's model, and just as willing to fail open -- a wrong or missing guess costs nothing,
 * so there is no reason to let a model load failure interrupt drawing.
 *
 * The model is DoodleNet (https://github.com/yining1023/doodleNet): a CNN trained on all 345
 * Quick, Draw! categories, converted to tfjs' layers format and hosted on the author's GitHub
 * Pages (free static hosting, no key, no credit card -- same $0 bar as every other service this
 * app calls). doodleClasses.ts carries its label list, in the exact order its output layer uses.
 */
import * as tf from '@tensorflow/tfjs'
import { DOODLE_CLASSES } from './doodleClasses'

const MODEL_URL =
  'https://yining1023.github.io/doodleNet/demo/DoodleClassifier_345/model/model.json'
/** The model was trained on 28x28 grids, same as the MNIST-style Quick, Draw! bitmaps. */
const INPUT_SIZE = 28

export interface DoodleGuess {
  label: string
  probability: number
}

let modelPromise: Promise<tf.LayersModel> | null = null

function getModel(): Promise<tf.LayersModel> {
  modelPromise ??= tf.loadLayersModel(MODEL_URL)
  return modelPromise
}

/** 'fire_hydrant' -> 'fire hydrant', matching the reference search box's own style (SUGGESTED_WORDS). */
export function toLabel(raw: string): string {
  return raw.replace(/_/g, ' ')
}

/**
 * The model-independent half of a guess: label the raw per-class probabilities and keep the top
 * few. Pulled out from guessDoodle so it is testable without a real tfjs model or a browser canvas
 * (the same reasoning nsfwCheck.ts's interpretPredictions is split out for).
 */
export function rankGuesses(
  probabilities: ArrayLike<number>,
  classes: readonly string[] = DOODLE_CLASSES,
  topK = 3,
): DoodleGuess[] {
  return Array.from(probabilities)
    .map((probability, index) => ({ label: toLabel(classes[index]), probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, topK)
}

/**
 * Downsamples a transparent drawing-layer canvas to the 28x28 grid the model expects. Reads only
 * the alpha channel -- how much ink is at a pixel, never its colour -- so a guess works the same
 * whether the artist drew in black pencil or the app's yellow. (DoodleNet's own demo instead reads
 * brightness off a canvas that is always black-on-white; alpha is the equivalent signal here,
 * since this canvas has no background to begin with.)
 */
export function toInputTensor(canvas: HTMLCanvasElement): tf.Tensor4D {
  const small = document.createElement('canvas')
  small.width = INPUT_SIZE
  small.height = INPUT_SIZE
  const ctx = small.getContext('2d')
  if (ctx === null) throw new Error('2d context unavailable')
  ctx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE)
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE)

  const ink = new Float32Array(INPUT_SIZE * INPUT_SIZE)
  for (let i = 0; i < ink.length; i++) {
    ink[i] = data[i * 4 + 3] / 255
  }
  return tf.tensor(ink, [1, INPUT_SIZE, INPUT_SIZE, 1])
}

/** True once enough of the grid has ink that a guess is worth running at all. */
export function hasEnoughInk(canvas: HTMLCanvasElement, minFraction = 0.01): boolean {
  const ctx = canvas.getContext('2d')
  if (ctx === null) return false
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let inked = 0
  const total = canvas.width * canvas.height
  // Sampling every 4th pixel is plenty to estimate coverage and far cheaper than reading all of them
  // on a full-resolution canvas.
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] > 16) inked++
  }
  return inked / (total / 4) >= minFraction
}

export async function guessDoodle(canvas: HTMLCanvasElement, topK = 3): Promise<DoodleGuess[]> {
  if (!hasEnoughInk(canvas)) return []
  try {
    const model = await getModel()
    const input = toInputTensor(canvas)
    try {
      const prediction = model.predict(input) as tf.Tensor
      try {
        const probabilities = await prediction.data()
        return rankGuesses(probabilities, DOODLE_CLASSES, topK)
      } finally {
        prediction.dispose()
      }
    } finally {
      input.dispose()
    }
  } catch {
    // No WebGL, offline, the model host is unreachable -- none of that should ever block drawing.
    return []
  }
}
