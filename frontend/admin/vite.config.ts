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
      // Plan 5.5: no sourcemaps shipped to production.
      sourcemap: false,
      target: 'esnext',
      rollupOptions: {
        output: {
          // Phase 5 perf: split heavy vendors so the entry chunk stays small
          // and caches independently.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui'
            if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-realtime'
            if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'vendor-react'
          },
        },
      },
    },
  }
})