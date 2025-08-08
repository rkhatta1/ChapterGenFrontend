import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // server: {
  //   proxy: {
  //     // Proxy requests to /process-youtube-url to your backend
  //     '/process-youtube-url': {
  //       target: 'https://chapgen.app',
  //       changeOrigin: true,
  //       secure: false,
  //       timeout: 5*60*1000, // 5 minutes
  //       proxyTimeout: 5*60*1000, // 5 minutes
  //     },
  //     // Proxy requests to the database service
  //     '/api': {
  //       target: 'https://chapgen.app',
  //       changeOrigin: true,
  //       secure: false,
  //     },
  //     // Proxy WebSocket connections
  //     '/ws': {
  //       target: 'wss://chapgen.app',
  //       ws: true,
  //     },
  //   },
  // },
})
