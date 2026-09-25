import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcssPostcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, '')
  const rawTarget = env.VITE_API_BASE_URL || 'http://localhost:5000'
  const target = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '')

  return {
    plugins: [react()],
    base: '/',
    server: {
      open: false,
      host: '0.0.0.0',
      port: 5174,
      watch: { usePolling: true, interval: 1000 },
      proxy: {
        '/api': { target, changeOrigin: true, secure: false },
        '/uploads': { target, changeOrigin: true, secure: false },
        '/socket.io': { target, changeOrigin: true, secure: false, ws: true },
      },
    },
    css: {
      postcss: {
        plugins: [tailwindcssPostcss(), autoprefixer()],
      },
    },
    resolve: {
      alias: { '@': path.resolve(here, 'src') },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
    },
  }
})