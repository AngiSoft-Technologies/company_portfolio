import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roles';

const SITE_SECTIONS = [
    { slug: 'about', key: 'site_about', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'hero', key: 'site_hero', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'contact', key: 'site_contact', roles: ['ADMIN'] },
    { slug: 'footer', key: 'site_footer', roles: ['ADMIN'] },
    { slug: 'ui', key: 'site_ui', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'booking', key: 'site_booking', roles: ['ADMIN', 'MARKETING'] },
    { slug: 'branding', key: 'site_branding', roles: ['ADMIN'] },
    { slug: 'navigation', key: 'site_navigation', roles: ['ADMIN'] },
    { slug: 'home-content', key: 'site_home_content', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'industries', key: 'site_industries', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'tech-platforms', key: 'site_tech_platforms', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'success-stories', key: 'site_success_stories', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'pricing', key: 'site_pricing', roles: ['ADMIN', 'MARKETING'] },
    { slug: 'products-page', key: 'site_products_page', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] },
    { slug: 'services-page', key: 'site_services_page', roles: ['ADMIN', 'MARKETING', 'CONTENT_CREATOR'] }
] as const;

/**
 * Site settings routes for managing public-facing content.
 * Uses the Setting model to store whitelisted site configuration keys.
 */
export default function siteRouter(prisma: PrismaClient) {
    const router = Router();

    const getSetting = async (key: string) => {
        const setting = await prisma.setting.findUnique({ where: { key } });
        return setting?.value ?? null;
    };

    const upsertSetting = async (key: string, value: any, req: AuthRequest) => {
        const setting = await prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        await prisma.auditLog.create({
            data: {
                actorId: req.user?.sub,
                actorRole: req.user?.role as any,
                action: 'site.update',
                entity: 'Setting',
                entityId: key
            }
        }).catch(() => undefined);

        return setting;
    };

    for (const section of SITE_SECTIONS) {
        router.get(`/${section.slug}`, async (_req, res) => {
            try {
                res.json(await getSetting(section.key));
            } catch (err: any) {
                res.status(500).json({ error: err.message });
            }
        });

        router.put(`/${section.slug}`, requireAuth, requireRoles(...section.roles), async (req: AuthRequest, res) => {
            try {
                const result = await upsertSetting(section.key, req.body, req);
                res.json(result.value);
            } catch (err: any) {
                res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
