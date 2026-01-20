// vite.config.js or vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcssPostcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react(),],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    port: 5173,
    open: true,
    watch: {
      usePolling: true,
      interval: 1000,

    },
    hmr: true, // Enable Hot Module Replacement

  },

  css: {
    postcss: {
      plugins: [tailwindcssPostcss(), autoprefixer(),],
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext', // Ensure compatibility with modern JavaScript features
    rollupOptions: {
      input: './index.html', // Ensure proper entry point for the build
    },
  },
  optimizeDeps: {
    include: ['rippleui'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './setupTests.js',
  },
})
