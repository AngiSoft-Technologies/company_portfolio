import { Router } from 'express';
import type { Db } from '../../../db';
import { ts, newId } from '../../../prisma/db';
import { requireAuth, AuthRequest } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { storedDocumentSchema, LEGAL_SETTING_KEYS } from './legal';

const SITE_SECTIONS = [
    { slug: 'about', key: 'site_about', permission: 'pages.update_about', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'hero', key: 'site_hero', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'contact', key: 'site_contact', permission: 'pages.update_contact', roles: ['ADMIN'] },
    { slug: 'footer', key: 'site_footer', permission: 'pages.update_site_chrome', roles: ['ADMIN'] },
    { slug: 'ui', key: 'site_ui', permission: 'pages.update_site_chrome', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'booking', key: 'site_booking', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING'] },
    { slug: 'branding', key: 'site_branding', permission: 'pages.update_site_chrome', roles: ['ADMIN'] },
    { slug: 'navigation', key: 'site_navigation', permission: 'pages.update_site_chrome', roles: ['ADMIN'] },
    { slug: 'home-content', key: 'site_home_content', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'industries', key: 'site_industries', permission: 'pages.update_industries', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'tech-platforms', key: 'site_tech_platforms', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'success-stories', key: 'site_success_stories', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'pricing', key: 'site_pricing', permission: 'services.manage_pricing', roles: ['ADMIN', 'MARKETING'] },
    { slug: 'products-page', key: 'site_products_page', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'services-page', key: 'site_services_page', permission: 'pages.update_home', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'careers_content', key: 'careers_content', permission: 'careers.update_content', roles: ['ADMIN', 'HR', 'MARKETING'] },
    // Structured privacy/terms copy consumed by the public GET /v1/legal/:key
    // endpoint. Same Setting rows, no HTML, ADMIN-only writes.
    { slug: 'legal-privacy', key: LEGAL_SETTING_KEYS.privacy, permission: 'pages.update_site_chrome', roles: ['ADMIN'] },
    { slug: 'legal-terms', key: LEGAL_SETTING_KEYS.terms, permission: 'pages.update_site_chrome', roles: ['ADMIN'] }
] as const;

/**
 * Site settings routes for managing public-facing content.
 * Uses the Setting model to store whitelisted site configuration keys.
 */
export default function siteRouter(prisma: Db) {
    const router = Router();

    const getSetting = async (key: string) => {
        const setting = await prisma.orm.public.Setting.where({ key }).first();
        return setting?.value ?? null;
    };

    const upsertSetting = async (key: string, value: any, req: AuthRequest) => {
        const setting = await prisma.transaction(async (tx) => {
            const existing = await tx.orm.public.Setting.where({ key }).first();
            if (existing) {
                return tx.orm.public.Setting.where({ key }).update({ value });
            }
            return tx.orm.public.Setting.create({ key, value, updatedAt: ts() });
        });

        await prisma.orm.public.AuditLog.create({
            id: newId(),
            actorId: req.user?.sub ?? null,
            actorRole: (req.user?.role as any) ?? null,
            action: 'site.update',
            entity: 'Setting',
            entityId: key
        }).catch(() => undefined);

        return setting;
    };

    for (const section of SITE_SECTIONS) {
        router.get(`/${section.slug}`, async (_req, res) => {
            try {
                res.json(await getSetting(section.key));
            } catch (err: any) {
                res.status(500).json({ error: 'Server error' });
            }
        });

        router.put(`/${section.slug}`, requireAuth, requireAccess(section.permission, [...section.roles]), async (req: AuthRequest, res) => {
            try {
                // Legal copy is rendered as React text nodes by the public site;
                // reject anything that is not the documented structured shape.
                const isLegalSection =
                    section.key === LEGAL_SETTING_KEYS.privacy || section.key === LEGAL_SETTING_KEYS.terms;
                let value: unknown = req.body;
                if (isLegalSection) {
                    const parsed = storedDocumentSchema.safeParse(req.body ?? {});
                    if (!parsed.success) {
                        return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
                    }
                    value = parsed.data;
                }
                const result = await upsertSetting(section.key, value, req);
                res.json((result as any).value);
            } catch (err: any) {
                res.status(500).json({ error: 'Server error' });
            }
        });
    }

    router.get('/all', async (_req, res) => {
        try {
            const entries = await Promise.all(
                SITE_SECTIONS.map(async (section) => [section.slug, await getSetting(section.key)])
            );
            res.json(Object.fromEntries(entries));
        } catch (err: any) {
            res.status(500).json({ error: 'Server error' });
        }
    });

    return router;
}
