/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sinopia',
        short_name: 'Sinopia',
        description: 'Draw on the real world. Leave it where you found it.',
        theme_color: '#8c3f2d',
        background_color: '#e4e1db',
        display: 'standalone',
        icons: [],
      },
      workbox: {
        // nsfwjs's TensorFlow.js model weight shards (tens of MB total) are
        // lazy-loaded on demand at publish time (PHASE-5a task 2) -- they
        // should never be part of the offline app-shell precache, and some
        // exceed workbox's default 2MB precache limit and fail the build.
        globIgnores: ['**/group1-shard*.js', '**/model.min-*.js'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
