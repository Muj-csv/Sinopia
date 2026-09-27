#!/usr/bin/env node
// Downloads the self-hosted MediaPipe pose model into public/models/, same
// model file and URL as ingest/ingest.py's ensure_model() (CLAUDE.md: "same
// MediaPipe .task model file in ingest and browser, self-hosted"). Gitignored
// (*.task, repo root .gitignore) -- each environment fetches it once.
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'models')
const outPath = join(outDir, 'pose_landmarker.task')

if (existsSync(outPath)) {
  console.log(`already present: ${outPath}`)
  process.exit(0)
}

mkdirSync(outDir, { recursive: true })
console.log(`downloading pose model -> ${outPath}`)
const res = await fetch(MODEL_URL)
if (!res.ok) {
  console.error(`download failed: ${res.status} ${res.statusText}`)
  process.exit(1)
}
const buf = Buffer.from(await res.arrayBuffer())
await import('node:fs/promises').then((fs) => fs.writeFile(outPath, buf))
console.log(`done (${buf.length} bytes)`)
