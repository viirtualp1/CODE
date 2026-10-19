import hosting from './vercel.json'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Preview uses the production SW/document cache policy as well.
export default defineConfig({
  preview: { headers: { 'Cache-Control': hosting.headers.find(rule => rule.source === '/sw.js')!.headers[0]!.value } },
  plugins: [vue(), VitePWA({
    registerType: 'prompt', includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
    manifest: {
      name: 'CODE — A little clarity', short_name: 'CODE', description: 'A quiet moment. A clever cryptogram. An offline puzzle game.',
      theme_color: '#f5f3ed', background_color: '#f5f3ed', display: 'standalone', start_url: '/', scope: '/',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
    },
    workbox: { cleanupOutdatedCaches: true, globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: '/index.html' },
  })],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
