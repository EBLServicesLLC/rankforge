import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'csp-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Allow unsafe-eval for rankforge3.html which uses new Function() and eval()
          res.setHeader(
            'Content-Security-Policy',
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
            "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
            "style-src * 'unsafe-inline'; " +
            "font-src * data:; " +
            "img-src * data: blob:; " +
            "connect-src *; " +
            "frame-src *;"
          )
          next()
        })
      }
    }
  ],
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