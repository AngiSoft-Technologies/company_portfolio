import { defineConfig, loadEnv, type ConfigEnv, type Plugin, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PRERENDER_ROUTES, type RouteMeta } from './src/router/prerender.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
// Netlify 301s the apex to www — canonical URLs, sitemap locs and JSON-LD
// must all use the final host.
const SITE_URL = 'https://www.angisoft.co.ke'
const SITE_NAME = 'AngiSoft Technologies'
const ORG_ID = `${SITE_URL}/#organization`

// Official social profiles — mirrored in public/llms.txt.
const SOCIAL_PROFILES = [
  'https://www.linkedin.com/company/angisoft-technologies',
  'https://github.com/AngiSoft-Technologies',
  'https://twitter.com/angisofttech',
  'https://x.com/AngiSoftTech',
  'https://www.facebook.com/angisofttechnologies',
  'https://www.instagram.com/angisofttech',
  'https://youtube.com/@angisofttechnologies',
]

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pageJsonLd = (meta: RouteMeta) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: meta.title,
  description: meta.description,
  url: `${SITE_URL}${meta.path === '/' ? '' : meta.path}`,
  isPartOf: { '@id': `${SITE_URL}/#website` },
})

// ─── Product-page prerender ────────────────────────────────────────────────
// Product detail routes are data-driven (GET /v1/products), so they cannot
// live in PRERENDER_ROUTES. At build time we fetch the published catalog and
// emit dist/products/<slug>/index.html per product with full meta, canonical,
// OG/Twitter tags and SoftwareApplication + BreadcrumbList + FAQPage JSON-LD,
// and append the URLs to sitemap.xml. If the API is unreachable the build
// still succeeds — product pages just fall back to client-rendered meta.
const API_ORIGIN = 'https://api.angisoft.co.ke'
const PRODUCT_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

interface BuildProduct {
  slug?: string
  name?: string
  tagline?: string | null
  description?: string
  seoTitle?: string | null
  seoDesc?: string | null
  demoUrl?: string | null
  published?: boolean
  faqs?: Array<{ question?: string; answer?: string }>
}

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max).trim()}…`

async function fetchJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

// /v1 is the canonical API prefix; /api is the legacy prefix still served by
// the previous backend build — try /v1 first so the switch is seamless.
async function fetchProducts(): Promise<BuildProduct[]> {
  for (const prefix of ['/v1', '/api']) {
    const data = await fetchJson(`${API_ORIGIN}${prefix}/products`)
    const list = Array.isArray(data) ? data : data?.data
    if (Array.isArray(list)) {
      return list.filter(
        (p) => p?.published !== false && typeof p?.slug === 'string' && PRODUCT_SLUG_RE.test(p.slug),
      )
    }
  }
  return []
}

async function fetchProductDetail(slug: string): Promise<BuildProduct | null> {
  for (const prefix of ['/v1', '/api']) {
    const data = await fetchJson(`${API_ORIGIN}${prefix}/products/${slug}`)
    if (data && !data.error) return data
  }
  return null
}

const productDescription = (p: BuildProduct) =>
  p.seoDesc || p.tagline || truncate(p.description || '', 160) || `${p.name} by AngiSoft Technologies`

const productJsonLd = (p: BuildProduct, path: string, faqs: BuildProduct['faqs']) => {
  const url = /^https?:\/\//i.test(p.demoUrl || '') ? p.demoUrl : `${SITE_URL}${path}`
  const nodes: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: p.name,
      description: productDescription(p),
      url,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      author: { '@id': ORG_ID },
      provider: { '@id': ORG_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
        { '@type': 'ListItem', position: 3, name: p.name, item: `${SITE_URL}${path}` },
      ],
    },
  ]
  const validFaqs = (faqs || []).filter((f) => f?.question && f?.answer)
  if (validFaqs.length) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: validFaqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
  }
  return nodes
}

const siteJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
    email: 'info@angisoft.co.ke',
    telephone: '+254710398690',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
    sameAs: SOCIAL_PROFILES,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@angisoft.co.ke',
      telephone: '+254710398690',
      areaServed: 'KE',
      availableLanguage: ['English', 'Swahili'],
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': ORG_ID },
  },
  // Flagship product family member on its own subdomain — declared here so
  // crawlers and AI engines connect the product to the parent company.
  {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    '@id': `${SITE_URL}/#mboqara-android`,
    name: 'MboQara for Android',
    operatingSystem: 'Android',
    applicationCategory: 'BusinessApplication',
    url: 'https://mboqara.angisoft.co.ke',
    installUrl: 'https://play.google.com/store/apps/details?id=ke.co.angisoft.mboqara',
    downloadUrl: 'https://play.google.com/store/apps/details?id=ke.co.angisoft.mboqara',
    description:
      'AI career platform by AngiSoft Technologies: discover live jobs, score profile fit, prepare tailored application documents and track applications.',
    author: { '@id': ORG_ID },
    provider: { '@id': ORG_ID },
  },
]

function injectMeta(html: string, meta: RouteMeta, extraJsonLd: object[] = []): string {
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
    `<script type="application/ld+json">${JSON.stringify(meta.path === '/' ? siteJsonLd : [pageJsonLd(meta), ...extraJsonLd])}</script>`,
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
 * <title>, meta description, canonical, OG/Twitter tags and JSON-LD, plus
 * a canonical `sitemap.xml` generated from the same route list.
 * Netlify pretty-URLs serve these ahead of the SPA fallback, so crawlers
 * get real per-route metadata without a SSR runtime.
 */
function prerenderPlugin(): Plugin {
  return {
    name: 'angisoft-prerender-meta',
    apply: 'build',
    async closeBundle() {
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

      // Data-driven product pages: fetch the published catalog and emit one
      // prerendered HTML + sitemap entry per product slug.
      const productPaths: string[] = []
      const products = await fetchProducts()
      for (const product of products) {
        const slug = product.slug as string
        const productPath = `/products/${slug}`
        const detail = (await fetchProductDetail(slug)) || product
        const meta: RouteMeta = {
          path: productPath,
          title: product.seoTitle || `${product.name} — ${SITE_NAME}`,
          description: productDescription(detail),
        }
        const html = injectMeta(
          template,
          meta,
          productJsonLd(detail, productPath, detail.faqs),
        )
        const routeDir = path.join(distDir, 'products', slug)
        fs.mkdirSync(routeDir, { recursive: true })
        fs.writeFileSync(path.join(routeDir, 'index.html'), html)
        productPaths.push(productPath)
      }

      const seen = new Set<string>()
      const sitemapUrls = [...PRERENDER_ROUTES.map((r) => r.path), ...productPaths]
        .filter((p) => {
          if (seen.has(p)) return false
          seen.add(p)
          return true
        })
        .map((p) => {
          const priority = p === '/' ? '1.0' : /privacy|terms|consent/.test(p) ? '0.3' : '0.8'
          return [
            '  <url>',
            `    <loc>${escapeHtml(`${SITE_URL}${p}`)}</loc>`,
            '    <changefreq>weekly</changefreq>',
            `    <priority>${priority}</priority>`,
            '  </url>',
          ].join('\n')
        })
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...sitemapUrls,
        '</urlset>',
        '',
      ].join('\n')
      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap)
    },
  }
}

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, here, '')
  const rawTarget = env.VITE_API_BASE_URL || 'http://localhost:5000'
  const target = rawTarget.replace(/\/+$/, '').replace(/\/api$/, '')

  return {
    plugins: [
      react(),
      // Phase 5.7: opt-in AVIF/WebP pipeline (sharp-backed). Imports without
      // directives keep Vite's original-format URL as the fallback:
      //   import avif from './hero.jpg?w=480;960;1440&format=avif&as=srcset'
      //   import webp from './hero.jpg?w=480;960;1440&format=webp&as=srcset'
      // Pass both srcsets to <OptimizedImage src={original} ... /> from
      // @angisoft/ui; its plain <img src> is the original-format fallback.
      imagetools(),
      tailwindcss(),
      prerenderPlugin(),
    ],
    base: '/',
    server: {
      open: true,
      port: 5173,
      watch: { usePolling: true, interval: 1000 },
      proxy: {
        // `@angisoft/api-client` and the admin client call `/v1/*`. Keep the
        // legacy `/api` rule for older tooling, but proxy the real base too.
        '/v1': { target, changeOrigin: true, secure: false },
        '/api': { target, changeOrigin: true, secure: false },
        // Only static assets live under /uploads/public on the backend; a
        // bare /uploads proxy can shadow SPA routes on full page reloads.
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
