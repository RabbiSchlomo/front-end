import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      manifest: {
        short_name: "Web3 App",
        name: "Web3 Base Network App",
        icons: [
          {
            src: "favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon"
          },
          {
            src: "logo192.png",
            type: "image/png",
            sizes: "192x192"
          },
          {
            src: "logo512.png",
            type: "image/png",
            sizes: "512x512"
          }
        ],
        start_url: ".",
        display: "standalone",
        theme_color: "#000000",
        background_color: "#ffffff"
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3000000,
      },
    })
  ],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Bundle RainbowKit and Wagmi together
          if (id.includes('@rainbow-me/rainbowkit') || 
              id.includes('wagmi') || 
              id.includes('viem')) {
            return 'web3-deps';
          }
          // React and related packages
          if (id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react-router-dom')) {
            return 'vendor';
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@rainbow-me/rainbowkit', 'wagmi', 'viem']
  }
})
