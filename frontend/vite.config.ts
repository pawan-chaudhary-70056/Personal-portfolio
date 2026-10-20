import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PROXY = {
  '/api': {
    target: 'http://127.0.0.1:4000',
    changeOrigin: false,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Same-origin in development, so session cookies and CSRF behave exactly
    // as they do in the single-origin production deployment.
    proxy: API_PROXY,
  },
  preview: {
    // Lets the production build be exercised locally against the real API.
    proxy: API_PROXY,
  },
})
