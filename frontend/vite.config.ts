import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['bosse.png', 'sl_stripes.png'],
      manifest: {
        name: 'Tåg Across STHLM',
        short_name: 'Tåg STHLM',
        description: 'Tåg Across STHLM GPS tracker och spel',
        theme_color: '#0A192F',
        background_color: '#0A192F',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'bosse.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'bosse.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3001
  }
})
