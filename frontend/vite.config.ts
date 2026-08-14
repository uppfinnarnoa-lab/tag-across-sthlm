import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// I Docker når frontend-containern backend på tjänstnamnet. Körs Vite direkt på
// värden går den mot localhost i stället.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'

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
    port: 3001,
    // Klienten adresserar alltid same origin. Proxyn här speglar det Nginx gör
    // i drift, så samma frontendkod fungerar i dev, på en telefon över LAN och
    // bakom Nginx -- utan CORS.
    proxy: {
      '/api': { target: backendUrl, changeOrigin: true },
      '/uploads': { target: backendUrl, changeOrigin: true },
      '/socket.io': { target: backendUrl, ws: true }
    }
  }
})
