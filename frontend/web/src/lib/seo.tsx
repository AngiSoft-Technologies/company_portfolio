// Shared SEO constants and JSON-LD builders for the public site.
// SITE_URL must match the canonical host emitted by vite.config.ts —
// Netlify 301s the apex to www.
import React from 'react';

export const SITE_URL = 'https://www.angisoft.co.ke';
export const SITE_NAME = 'AngiSoft Technologies';
export const ORG_ID = `${SITE_URL}/#organization`;

const serialize = (data: unknown) =>
    JSON.stringify(data).replace(/</g, '\\u003c');

export function JsonLd({ data }: { data: unknown | unknown[] }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serialize(data) }}
        />
    );
}

const absoluteHttpUrl = (value?: string) =>
    value && /^https?:\/\//i.test(value) ? value : null;

// Canonical product URL: the product's own web app (e.g. a *.angisoft.co.ke
// subdomain) when one exists, otherwise the on-site detail page.
export const productCanonicalUrl = (product: { slug?: string; demoUrl?: string }) =>
    absoluteHttpUrl(product?.demoUrl) || `${SITE_URL}/products/${product?.slug}`;

export function softwareApplicationJsonLd(product: {
    name?: string;
    slug?: string;
    tagline?: string;
    shortDescription?: string;
    description?: string;
    demoUrl?: string;
    categoryLabel?: string;
}) {
    const description =
        product.shortDescription || product.tagline || product.description || '';
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: product.name,
        description,
        url: productCanonicalUrl(product),
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: product.categoryLabel || undefined,
        operatingSystem: 'Web',
        author: { '@id': ORG_ID },
        provider: { '@id': ORG_ID },
    };
}

export function productsItemListJsonLd(products: Array<Parameters<typeof softwareApplicationJsonLd>[0]>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'AngiSoft Technologies products',
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: softwareApplicationJsonLd(product),
        })),
    };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${SITE_URL}${item.path}`,
        })),
    };
}

export function faqJsonLd(faqs: Array<{ question?: string; answer?: string }>) {
    const valid = (faqs || []).filter((f) => f?.question && f?.answer);
    if (!valid.length) return null;
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: valid.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
    };
}
