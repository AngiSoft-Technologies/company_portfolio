/**
 * CMS-backed Meta product feed (Phase 7 7F).
 *
 * Meta Catalog/Shops ads, Instagram shopping surfaces and WhatsApp commerce all
 * need a machine-readable product source. Our published `Service` and
 * `PricingPackage` rows remain the source of truth; this endpoint only renders
 * them as RSS 2.0 with Google/Meta product namespaces. No credentials are
 * required to poll the feed, and no Meta fee is ever modified by this route.
 */

import { Router } from 'express';
import db, { type Db } from '../../../db';
import { getConfig } from '../../../shared/services/runtimeConfig';

function xml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .slice(0, 5000);
}

function publicUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function money(value: unknown, currency: unknown): string {
  const amount = String(value ?? '0').replace(/[^\d.-]/g, '') || '0';
  const code = String(currency ?? 'KES').toUpperCase().slice(0, 8) || 'KES';
  return `${amount} ${code}`;
}

interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  price: string;
}

function renderItem(siteUrl: string, item: FeedItem): string {
  return `
    <item>
      <title>${xml(item.title)}</title>
      <link>${xml(item.link)}</link>
      <description>${xml(item.description)}</description>
      <guid isPermaLink="false">${xml(item.id)}</guid>
      <g:id>${xml(item.id)}</g:id>
      <g:title>${xml(item.title)}</g:title>
      <g:description>${xml(item.description)}</g:description>
      <g:link>${xml(item.link)}</g:link>
      <g:image_link>${xml(item.imageLink)}</g:image_link>
      <g:price>${xml(item.price)}</g:price>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>AngiSoft</g:brand>
    </item>`;
}

export default function catalogFeedRouter(prisma: Db = db) {
  const router = Router();

  router.get(['/feed.xml', '/feed'], async (_req, res) => {
    try {
      const siteUrl = String(getConfig('PUBLIC_SITE_URL') || 'https://angisoft.co.ke');
      const [packageRows, serviceRows] = await Promise.all([
        prisma.orm.public.PricingPackage
          .where({ published: true })
          .include('service', (s: any) => s.select('id', 'title', 'slug', 'description', 'images', 'priceFrom', 'currency', 'published'))
          .orderBy((p: any) => p.sortOrder.asc())
          .all(),
        prisma.orm.public.Service
          .where({ published: true })
          .all(),
      ]);
      const packages = packageRows as any[];
      const services = serviceRows as any[];

      const items: FeedItem[] = [];
      const packagedServiceIds = new Set<string>();
      for (const pkg of packages) {
        const service = pkg.service;
        if (!service || service.published === false) continue;
        packagedServiceIds.add(String(service.id));
        const images = Array.isArray(service.images) ? service.images : [];
        items.push({
          id: `package-${pkg.id}`,
          title: `${service.title} — ${pkg.name}`,
          description: String(pkg.description || service.description || `${pkg.name} from AngiSoft Technologies`).slice(0, 5000),
          link: publicUrl(siteUrl, `/services/${service.slug}#pricing`),
          imageLink: publicUrl(siteUrl, String(images[0] || '/og-default.png')),
          price: money(pkg.price, pkg.currency || service.currency),
        });
      }

      for (const service of services) {
        if (packagedServiceIds.has(String(service.id))) continue;
        const images = Array.isArray(service.images) ? service.images : [];
        items.push({
          id: `service-${service.id}`,
          title: String(service.title || 'AngiSoft service'),
          description: String(service.description || 'Custom software, ERP, IoT and AI services from AngiSoft Technologies').slice(0, 5000),
          link: publicUrl(siteUrl, `/services/${service.slug}`),
          imageLink: publicUrl(siteUrl, String(images[0] || '/og-default.png')),
          price: money(service.priceFrom, service.currency),
        });
      }

      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>AngiSoft Technologies services</title>
    <link>${xml(siteUrl)}</link>
    <description>Published software products, services and pricing packages from AngiSoft Technologies.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items.map((item) => renderItem(siteUrl, item)).join('')}
  </channel>
</rss>`;
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(xmlBody);
    } catch {
      res.status(500).set('Content-Type', 'application/xml; charset=utf-8')
        .send('<?xml version="1.0" encoding="UTF-8"?><error>Feed unavailable</error>');
    }
  });

  return router;
}
