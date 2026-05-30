import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: {
    headers: {
      'Content-Security-Policy':
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "style-src * 'unsafe-inline'; " +
        "font-src * data:; " +
        "img-src * data: blob:; " +
        "connect-src *; " +
        "frame-src *;"
    }
  }
})
