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
    }),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/e2e/**'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
