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
            if (!about) {
                return res.json({
                    title: "Who We Are",
                    subtitle: "Your Trusted Technology Partner",
                    description: [
                        "AngiSoft Technologies is a premier software development company headquartered in Kenya, serving clients across Africa and globally.",
                        "We specialize in building innovative, scalable, and secure digital solutions that drive business growth.",
                        "Our team of skilled developers, designers, and engineers are passionate about technology and committed to delivering excellence."
                    ],
                    values: [
                        { icon: "FaLightbulb", title: "Innovation", text: "We stay ahead of technology trends to deliver cutting-edge solutions" },
                        { icon: "FaHandshake", title: "Integrity", text: "Transparent communication and honest partnerships" },
                        { icon: "FaAward", title: "Excellence", text: "Uncompromising quality in everything we create" },
                        { icon: "FaUsers", title: "Collaboration", text: "Your success is our primary mission" }
                    ],
                    stats: [
                        { value: 2019, label: "Founded", prefix: "" },
                        { value: 50, suffix: "+", label: "Happy Clients" },
                        { value: 100, suffix: "+", label: "Projects Delivered" },
                        { value: 15, suffix: "+", label: "Team Members" }
                    ],
                    achievements: [
                        "ISO 27001 Security Standards Compliant",
                        "24/7 Support & Maintenance",
                        "Agile Development Methodology",
                        "100% Client Satisfaction Rate"
                    ],
                    videoUrl: null,
                    imageUrl: null
                });
            }
            res.json(about);
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
            if (!hero) {
                return res.json({
                    headline: "Building Tomorrow's",
                    headlineHighlight: "Digital Solutions",
                    subheadline: "Today",
                    tagline: "We transform ideas into powerful software products that drive business growth and innovation across Africa and beyond.",
                    ctaPrimary: { text: "Start Your Project", link: "/booking" },
                    ctaSecondary: { text: "View Our Work", link: "/#projects" },
                    stats: [
                        { value: 50, suffix: "+", label: "Happy Clients", icon: "FaUsers" },
                        { value: 100, suffix: "+", label: "Projects Delivered", icon: "FaProjectDiagram" },
                        { value: 5, suffix: "+", label: "Years Experience", icon: "FaAward" },
                        { value: 24, suffix: "/7", label: "Support Available", icon: "FaHeadset" }
                    ],
                    backgroundVideo: "/videos/Logo - AngiSoft Technologies.mp4",
                    backgroundImage: "/images/Logo - AngiSoft Technologies.png"
                });
            }
            res.json(hero);
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
            if (!contact) {
                return res.json({
                    companyName: "AngiSoft Technologies",
                    email: "info@angisofttechnologies.com",
                    phone: "+254 700 000 000",
                    address: {
                        street: "Kimathi Street",
                        city: "Nairobi",
                        country: "Kenya",
                        postalCode: "00100"
                    },
                    hours: {
                        weekdays: "Mon - Fri: 8:00 AM - 6:00 PM",
                        weekends: "Sat: 9:00 AM - 1:00 PM"
                    },
                    social: {
                        linkedin: "https://linkedin.com/company/angisofttechnologies",
                        twitter: "https://twitter.com/angisofttech",
                        github: "https://github.com/angisofttechnologies",
                        facebook: "https://facebook.com/angisofttechnologies"
                    },
                    mapUrl: null
                });
            }
            res.json(contact);
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
            if (!footer) {
                return res.json({
                    description: "AngiSoft Technologies is a premier software development company delivering innovative digital solutions across Africa and beyond.",
                    quickLinks: [
                        { label: "About Us", href: "/#about" },
                        { label: "Services", href: "/#services" },
                        { label: "Projects", href: "/#projects" },
                        { label: "Blog", href: "/blog" },
                        { label: "Contact", href: "/#contact" }
                    ],
                    legalLinks: [
                        { label: "Privacy Policy", href: "/privacy" },
                        { label: "Terms of Service", href: "/terms" },
                        { label: "Cookie Policy", href: "/cookies" }
                    ],
                    newsletter: {
                        enabled: true,
                        title: "Stay Updated",
                        description: "Subscribe to our newsletter for the latest updates and insights."
                    },
                    copyright: "© {year} AngiSoft Technologies. All rights reserved."
                });
            }
            res.json(footer);
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

    // ==================== BRANDING ====================

    // GET /api/site/branding - Get branding assets
    router.get('/branding', async (req, res) => {
        try {
            const branding = await getSetting('site_branding');
            if (!branding) {
                return res.json({
                    logo: "/images/angisoft_logo.png",
                    logoDark: "/images/angisoft_logo_dark.png",
                    favicon: "/favicon.ico",
                    siteName: "AngiSoft Technologies",
                    tagline: "Building Tomorrow's Digital Solutions Today",
                    colors: {
                        primary: "#0891b2",
                        secondary: "#06b6d4",
                        accent: "#f59e0b"
                    }
                });
            }
            res.json(branding);
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
            const [about, hero, contact, footer, branding] = await Promise.all([
                getSetting('site_about'),
                getSetting('site_hero'),
                getSetting('site_contact'),
                getSetting('site_footer'),
                getSetting('site_branding')
            ]);
            res.json({
                about: about || null,
                hero: hero || null,
                contact: contact || null,
                footer: footer || null,
                branding: branding || null
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
