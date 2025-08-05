import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests to /process-youtube-url to your backend
      '/process-youtube-url': {
        target: 'https://chapgen.app',
        changeOrigin: true,
        secure: false,
      },
      // Proxy requests to the database service
      '/api': {
        target: 'https://chapgen.app',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections
      '/ws': {
        target: 'wss://chapgen.app',
        ws: true,
      },
    },
  },
})
