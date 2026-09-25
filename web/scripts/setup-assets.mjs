/**
 * Copies self-hosted MediaPipe assets into public/ (CLAUDE.md: "self-hosted",
 * NFR-001: nothing fetched from a CDN at runtime). Both are gitignored --
 * regeneratable, and the WASM build alone is ~34MB. Runs on `npm install`;
 * skips quietly if a source isn't there yet (e.g. ingest hasn't produced the
 * model file), so a fresh clone still installs cleanly.
 */
import { existsSync, cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function copyIfMissing(src, dest, label) {
  if (existsSync(dest)) return
  if (!existsSync(src)) {
    console.warn(`[setup-assets] ${label} not found at ${src} -- skipping (see CLAUDE.md).`)
    return
  }
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log(`[setup-assets] copied ${label} -> ${dest}`)
}

copyIfMissing(
  join(webRoot, '..', 'ingest', 'pose_landmarker.task'),
  join(webRoot, 'public', 'pose_landmarker.task'),
  'pose_landmarker.task',
)

copyIfMissing(
  join(webRoot, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm'),
  join(webRoot, 'public', 'mediapipe-wasm'),
  '@mediapipe/tasks-vision wasm build',
)
