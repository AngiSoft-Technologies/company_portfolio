import { defineConfig, type UserConfigFn, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcssPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import * as path from 'node:path';

function normalizeOrigin(origin?: string): string {
  if (!origin) return '';
  return origin.replace(/\/+$/, '').replace(/\/api$/, '');
}

/**
 * Shared Vite config for both frontend apps.
 * - proxies /api, /uploads, /socket.io to the backend (VITE_API_BASE_URL or
 *   http://localhost:5000 in dev)
 * - alias `@` → <context root>/src
 * - Tailwind 4 via @tailwindcss/postcss
 */
export function createAngiAppConfig(options: { appDir: string; port?: number }): UserConfigFn {
  const appDir = options.appDir;
  const aliasPath = path.resolve(appDir, 'src');

  return defineConfig(() => {
    const rawTarget = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const target = normalizeOrigin(rawTarget);

    return {
      plugins: [react()],
      base: '/',
      root: appDir,
      server: {
        open: true,
        port: options.port ?? 5173,
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
        alias: { '@': aliasPath },
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        target: 'esnext',
        rollupOptions: { input: `${appDir}/index.html` },
      },
    };
  });
}

export default createAngiAppConfig;