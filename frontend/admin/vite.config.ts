import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, '')
  const rawTarget = env.VITE_API_BASE_URL || 'http://localhost:5000'
  const target = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '')

  return {
    plugins: [
      react(),
      // Phase 5.7: opt-in AVIF/WebP pipeline (sharp-backed). Imports without
      // directives keep Vite's original-format URL as the fallback:
      //   import avif from './logo.png?w=240;480;960&format=avif&as=srcset'
      //   import webp from './logo.png?w=240;480;960&format=webp&as=srcset'
      // Pass both srcsets to <OptimizedImage src={original} ... /> from
      // @angisoft/ui; its plain <img src> is the original-format fallback.
      imagetools(),
      tailwindcss(),
    ],
    base: '/',
    server: {
      open: false,
      host: '0.0.0.0',
      port: 5174,
      watch: { usePolling: true, interval: 1000 },
      proxy: {
        // `@angisoft/api-client` and admin screens call `/v1/*`. Keep the
        // legacy `/api` rule for older tooling, but proxy the real base too.
        '/v1': { target, changeOrigin: true, secure: false },
        '/api': { target, changeOrigin: true, secure: false },
        // Narrow to the static-asset prefix: the admin SPA has a real
        // `/uploads` route (File Uploads) that a bare `/uploads` proxy would
        // shadow on full reloads. The backend only serves `/uploads/public/*`.
        '/uploads/public': { target, changeOrigin: true, secure: false },
        '/socket.io': { target, changeOrigin: true, secure: false, ws: true },
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