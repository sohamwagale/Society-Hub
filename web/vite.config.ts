import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? '/Society-Hub/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // In development, proxy /api → backend so cookies are same-origin
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      // Also proxy /uploads for static files served by FastAPI
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

