import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: false, // manifest.json est déjà servi depuis public/
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/habits/, /^\/engagements/, /^\/projects/],
        runtimeCaching: [
          {
            // Données Supabase : réseau d'abord (fraîches si en ligne), cache si hors ligne.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'momentum-supabase-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Assets statiques (JS/CSS/images) : cache d'abord, réseau en secours.
            urlPattern: ({ request }) =>
              ['script', 'style', 'image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'momentum-assets-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Pages de l'app : accessibles hors ligne une fois visitées.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              (url.pathname.startsWith('/habits') ||
                url.pathname.startsWith('/engagements') ||
                url.pathname.startsWith('/projects')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'momentum-pages-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
