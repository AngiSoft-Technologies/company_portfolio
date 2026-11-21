import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcssPostcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PRERENDER_ROUTES, type RouteMeta } from './src/router/prerender'

const here = path.dirname(fileURLToPath(import.meta.url))
const SITE_URL = 'https://angisoft.co.ke'
const SITE_NAME = 'AngiSoft Technologies'

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pageJsonLd = (meta: RouteMeta) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: meta.title,
  description: meta.description,
  url: `${SITE_URL}${meta.path === '/' ? '' : meta.path}`,
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
})

const siteJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  },
]

function injectMeta(html: string, meta: RouteMeta): string {
  const url = `${SITE_URL}${meta.path === '/' ? '' : meta.path}`
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)

  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)

  const tags = [
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<script type="application/ld+json">${JSON.stringify(meta.path === '/' ? siteJsonLd : pageJsonLd(meta))}</script>`,
  ].join('\n    ')

  if (out.includes('</head>')) {
    out = out.replace('</head>', `    ${tags}\n  </head>`)
  } else {
    out = out.replace('<head>', `<head>\n    ${tags}`)
  }
  return out
}

/**
 * Build-time prerender (plan Phase 5.6): after `vite build`, emit one
 * `dist/<route>/index.html` per PRERENDER_ROUTES entry with per-page
 * <title>, meta description, canonical, OG/Twitter tags and JSON-LD.
 * Netlify pretty-URLs serve these ahead of the SPA fallback, so crawlers
 * get real per-route metadata without a SSR runtime.
 */
function prerenderPlugin(): Plugin {
  return {
    name: 'angisoft-prerender-meta',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(here, 'dist')
      const indexPath = path.join(distDir, 'index.html')
      if (!fs.existsSync(indexPath)) return
      const template = fs.readFileSync(indexPath, 'utf8')

      for (const meta of PRERENDER_ROUTES) {
        const html = injectMeta(template, meta)
        if (meta.path === '/') {
          fs.writeFileSync(indexPath, html)
          continue
        }
        const routeDir = path.join(distDir, meta.path.replace(/^\//, ''))
        fs.mkdirSync(routeDir, { recursive: true })
        fs.writeFileSync(path.join(routeDir, 'index.html'), html)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, '')
  const rawTarget = env.VITE_API_BASE_URL || 'http://localhost:5000'
  const target = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '')

  return {
    plugins: [react(), prerenderPlugin()],
    base: '/',
    server: {
      open: true,
      port: 5173,
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
            if (id.includes('react-icons')) return 'vendor-icons'
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui'
            if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-realtime'
            if (/node_modules\/(dompurify|marked|motion|swiper|framer-motion)\//.test(id)) return 'vendor-lib'
            if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'vendor-react'
          },
        },
      },
    },
  }
})
