/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves project pages at https://<user>.github.io/Sinopia/, not
// domain root, so the build needs that path prefix. The deploy workflow sets
// GITHUB_PAGES=true; local dev/tests keep the default '/' base.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Sinopia/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
