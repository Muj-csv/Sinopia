import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'
import './shell.css'

/**
 * Without this, vite-plugin-pwa falls back to injecting a bare
 * `navigator.serviceWorker.register()` with no update handling at all (verified in
 * node_modules/vite-plugin-pwa/dist/chunk-I2Z7IWCN.js's generateSimpleSWRegister). The new
 * service worker still activates in the background (registerType: 'autoUpdate' forces
 * skipWaiting/clientsClaim), but a tab that's already open keeps running the JS it already
 * loaded -- a phone where Sinopia was opened once and left running stays on pre-fix code
 * indefinitely. Importing the real virtual:pwa-register module wires up the reload-on-update
 * listener (workbox-window's `activated` event) so an open tab picks up a new deploy itself.
 */
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
