import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  build: {
    rollupOptions: {
      output: {
        // console.*/debugger nur im Production-Build entfernen (Vite 8 nutzt
        // Rolldown/Oxc statt esbuild zum Minifizieren) – im Dev-Server
        // (command === 'serve') bleiben sie für die lokale Fehlersuche erhalten
        minify: command === 'build' ? { compress: { dropConsole: true, dropDebugger: true } } : false,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' aktualisiert den Service Worker automatisch im Hintergrund,
      // ohne dass der Nutzer die App manuell neu installieren muss
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Voyag – Travel Together',
        short_name: 'Voyag',
        description: 'Plane und erlebe Reisen gemeinsam mit Voyag.',
        lang: 'de',
        theme_color: '#080d1a',
        background_color: '#080d1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cached den App-Shell (HTML/JS/CSS/Icons) für Offline-Grundfunktionalität.
        // Supabase-Daten werden bewusst NICHT offline-synchronisiert.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // Länder-Flaggen werden für wiederholte Besuche zwischengespeichert
            urlPattern: /^https:\/\/flagcdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'flag-images-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        // PWA im Dev-Modus standardmäßig deaktiviert – siehe Hinweis in der README/Antwort
        enabled: false,
      },
    }),
  ],
}))
