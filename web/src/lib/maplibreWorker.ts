/**
 * MapLibre's worker fails to load under Vite (dev and prod) unless its
 * URL is resolved explicitly -- confirmed in Phase 1 (PinPicker.tsx).
 * Side-effect import this once in every file that constructs a
 * maplibregl.Map, before construction.
 */
import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

maplibregl.setWorkerUrl(maplibreWorkerUrl)
