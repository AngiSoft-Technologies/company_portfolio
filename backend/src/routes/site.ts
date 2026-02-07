import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

/**
 * Middleware to check if user has admin role
 */
function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

/**
 * Site settings routes for managing public-facing content
 * Uses the Setting model to store site configuration as key-value pairs
 */
export default function siteRouter(prisma: PrismaClient) {
    const router = Router();

    // Helper to get a setting by key
    const getSetting = async (key: string) => {
        const setting = await prisma.setting.findUnique({ where: { key } });
        return setting?.value ?? null;
    };

    // Helper to upsert a setting
    const upsertSetting = async (key: string, value: any) => {
        return prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    };

    // ==================== ABOUT SECTION ====================

    // GET /api/site/about - Get about section content
    router.get('/about', async (req, res) => {
        try {
            const about = await getSetting('site_about');
            res.json(about || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/about - Update about section (admin only)
    router.put('/about', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_about', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== HERO SECTION ====================

    // GET /api/site/hero - Get hero section content
    router.get('/hero', async (req, res) => {
        try {
            const hero = await getSetting('site_hero');
            res.json(hero || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/hero - Update hero section (admin only)
    router.put('/hero', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_hero', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== CONTACT SECTION ====================

    // GET /api/site/contact - Get contact information
    router.get('/contact', async (req, res) => {
        try {
            const contact = await getSetting('site_contact');
            res.json(contact || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/contact - Update contact info (admin only)
    router.put('/contact', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_contact', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== FOOTER SECTION ====================

    // GET /api/site/footer - Get footer content
    router.get('/footer', async (req, res) => {
        try {
            const footer = await getSetting('site_footer');
            res.json(footer || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/footer - Update footer content (admin only)
    router.put('/footer', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_footer', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== UI COPY ====================

    // GET /api/site/ui - Get UI copy for headings, CTAs, and labels
    router.get('/ui', async (req, res) => {
        try {
            const ui = await getSetting('site_ui');
            res.json(ui || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/ui - Update UI copy (admin only)
    router.put('/ui', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_ui', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== BOOKING COPY ====================

    // GET /api/site/booking - Get booking page copy and steps
    router.get('/booking', async (req, res) => {
        try {
            const booking = await getSetting('site_booking');
            res.json(booking || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/booking - Update booking page copy and steps (admin only)
    router.put('/booking', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_booking', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== BRANDING ====================

    // GET /api/site/branding - Get branding assets
    router.get('/branding', async (req, res) => {
        try {
            const branding = await getSetting('site_branding');
            res.json(branding || null);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/site/branding - Update branding (admin only)
    router.put('/branding', requireAuth, requireAdmin, async (req, res) => {
        try {
            const result = await upsertSetting('site_branding', req.body);
            res.json(result.value);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // ==================== GET ALL SITE SETTINGS ====================

    // GET /api/site/all - Get all site settings at once (for SSR/preloading)
    router.get('/all', async (req, res) => {
        try {
            const [about, hero, contact, footer, branding, ui, booking] = await Promise.all([
                getSetting('site_about'),
                getSetting('site_hero'),
                getSetting('site_contact'),
                getSetting('site_footer'),
                getSetting('site_branding'),
                getSetting('site_ui'),
                getSetting('site_booking')
            ]);
            res.json({
                about: about || null,
                hero: hero || null,
                contact: contact || null,
                footer: footer || null,
                branding: branding || null,
                ui: ui || null,
                booking: booking || null
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
