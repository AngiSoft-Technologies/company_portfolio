import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Optional pre-generated About-page default content. When present, it seeds the
// canonical 26-key contract described by the frontend hook. Regenerate with:
//   npm run extract:about-default
// If the file is missing, the inline fallback below is used instead.
let aboutDefaultData: {
  defaultAbout: Record<string, any>;
  ABOUT_SCHEMA_VERSION: number;
  ABOUT_SECTION_KEYS?: string[];
} | null = null;
let ABOUT_SECTION_KEYS: string[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  aboutDefaultData = require('./about-default-data') as any;
  ABOUT_SECTION_KEYS = aboutDefaultData?.ABOUT_SECTION_KEYS ?? [];
} catch {
  aboutDefaultData = null;
}

dotenv.config();

const prisma = new PrismaClient();

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

async function main() {
    console.log('🌱 Starting comprehensive database seed...\n');

    // ==================== ADMIN USER ====================
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const hash = await bcrypt.hash(password, 10);

    const existing = await prisma.employee.findUnique({ where: { email: 'admin@angisoft.co.ke' } });
    if (!existing) {
        await prisma.employee.create({
            data: {
                firstName: 'Super',
                lastName: 'Admin',
                email: 'admin@angisoft.co.ke',
                role: 'SUPER_ADMIN',
                username: 'super-admin',
                passwordHash: hash,
                twoFactorEnabled: false,
                twoFactorSecret: null,
                acceptedAt: new Date(),
                bio: 'System Administrator for AngiSoft Technologies. Innovate \u2022 Build \u2022 Empower.',
                phone: '+254710398690'
            }
        });
        console.log('✅ Admin user created (email: admin@angisoft.co.ke, password: from ADMIN_PASSWORD env or default)');
    } else {
        console.log('ℹ️  Admin user already exists');
    }

    const admin = await prisma.employee.findUnique({ where: { email: 'admin@angisoft.co.ke' } });
    const overwritePublicContent = process.env.SEED_OVERWRITE_PUBLIC_CONTENT === 'true';

    const permissionKeys = [
        'content.view', 'content.manage', 'content.publish', 'content.delete',
        'settings.view', 'settings.manage',
        'roles.view', 'roles.manage',
        'staff.view', 'staff.manage', 'staff.profile.manage',
        'products.manage', 'services.manage', 'blog.manage', 'careers.manage', 'analytics.view'
    ];

    for (const key of permissionKeys) {
        await prisma.permission.upsert({
            where: { key },
            update: {},
            create: { key, description: key.replace(/\./g, ' ') }
        });
    }

    const roleDefinitions = [
        { key: 'SUPER_ADMIN', name: 'Super Admin', description: 'Full platform ownership', permissions: permissionKeys },
        { key: 'ADMIN', name: 'Admin', description: 'Manage public content and operations', permissions: permissionKeys.filter((key) => key !== 'roles.manage') },
        { key: 'MARKETING', name: 'Marketing', description: 'Manage public marketing content', permissions: ['content.view', 'content.manage', 'content.publish', 'settings.view', 'products.manage', 'services.manage', 'blog.manage', 'analytics.view'] },
        { key: 'CONTENT_CREATOR', name: 'Content Creator', description: 'Create and update public content drafts', permissions: ['content.view', 'content.manage', 'settings.view', 'blog.manage'] },
        { key: 'BLOG_MANAGER', name: 'Blog Manager', description: 'Manage blog and learning content', permissions: ['content.view', 'blog.manage', 'content.publish'] },
        { key: 'HR', name: 'HR', description: 'Manage careers and staff public profiles', permissions: ['staff.view', 'staff.manage', 'staff.profile.manage', 'careers.manage'] },
        { key: 'DEVELOPER', name: 'Developer', description: 'Manage assigned technical content and portfolio', permissions: ['content.view', 'staff.profile.manage'] },
        { key: 'STAFF', name: 'Staff', description: 'Manage own public staff profile and portfolio', permissions: ['staff.profile.manage'] }
    ];

    for (const definition of roleDefinitions) {
        const role = await prisma.appRole.upsert({
            where: { key: definition.key },
            update: { name: definition.name, description: definition.description, system: true },
            create: { key: definition.key, name: definition.name, description: definition.description, system: true }
        });
        const permissions = await prisma.permission.findMany({ where: { key: { in: definition.permissions } } });
        await prisma.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
            skipDuplicates: true
        });
    }

    if (admin) {
        const superRole = await prisma.appRole.findUnique({ where: { key: 'SUPER_ADMIN' } });
        if (superRole) {
            await prisma.employeeRoleAssignment.upsert({
                where: { employeeId_roleId: { employeeId: admin.id, roleId: superRole.id } },
                update: {},
                create: { employeeId: admin.id, roleId: superRole.id }
            });
        }
    }
    console.log('✅ RBAC roles and permissions seeded');

    const seedSetting = async (key: string, value: any) => {
        await prisma.setting.upsert({
            where: { key },
            update: overwritePublicContent ? { value } : {},
            create: { key, value }
        });
    };

    // Break the flat about object into composed AboutSection rows (one row per
    // key), preserving the declared order. This makes the About page editable as
    // individual DB rows via the admin CMS (/api/about-sections).
    // Canonical ordering matches the frontend ABOUT_SECTION_KEYS contract so the
    // page composer assembles sections in the intended visual sequence.
    const seedAboutSections = async (about: Record<string, any>) => {
        const order: string[] = [
            'heroSlides', 'intro', 'numbersHeading', 'numberStories', 'geography',
            'sustainability', 'collaboration', 'timelineHeading', 'timeline',
            'industriesHeading', 'industries', 'clientsHeading', 'clients',
            'clientStats', 'clientHighlights', 'testimonialsHeading', 'serviceMap',
            'transparency', 'partnerships', 'solutionTypes', 'technologies',
            'specializedCapabilities', 'whyGuarantee', 'pricing', 'pricingQuotation', 'cta'
        ];
        const titles: Record<string, string> = {
            heroSlides: 'Hero Leadership Slides', intro: 'Hero Introduction',
            numbersHeading: 'AngiSoft in Numbers Heading', numberStories: 'AngiSoft in Numbers',
            geography: 'Our Geography', sustainability: 'Sustainability and Social Responsibility',
            collaboration: 'How We Collaborate', timelineHeading: 'Highlights Heading',
            timeline: 'AngiSoft Highlights', industriesHeading: 'Industries Heading',
            industries: 'Industries We Serve', clientsHeading: 'Our Clients Heading',
            clients: 'Our Clients', clientStats: 'Client Stats', clientHighlights: 'Client Highlights',
            testimonialsHeading: 'What Our Clients Say Heading', serviceMap: 'Our Service Map',
            transparency: 'Building Trust with Transparency', partnerships: 'Partnerships and Recognitions',
            solutionTypes: 'Solutions We Cover', technologies: 'Capabilities and Technological Expertise',
            specializedCapabilities: 'Specialized Technology Capabilities',
            whyGuarantee: 'What We Do to Guarantee Project Success', pricing: 'Our Pricing Policy',
            pricingQuotation: 'Leadership Pricing Quotation', cta: 'Final Call to Action'
        };
        const seen = new Set<string>();
        let idx = 0;
        for (const key of order) {
            if (!(key in about)) continue;
            seen.add(key);
            await prisma.aboutSection.upsert({
                where: { key },
                update: overwritePublicContent ? { content: about[key], sortOrder: idx, title: titles[key] || key, enabled: true } : {},
                create: { key, title: titles[key] || key, sortOrder: idx, enabled: true, content: about[key] }
            });
            idx += 1;
        }
        // Any keys in the canonical contract not yet seen still get seeded.
        // We only seed keys recognized by the frontend (ABOUT_SECTION_KEYS);
        // metadata keys like `schemaVersion` are intentionally excluded so the
        // admin CMS and public API expose exactly the sections the hook renders.
        const extra = (ABOUT_SECTION_KEYS.length ? ABOUT_SECTION_KEYS : Object.keys(about))
            .filter((k) => !seen.has(k) && k in about);
        for (const key of extra) {
            await prisma.aboutSection.upsert({
                where: { key },
                update: overwritePublicContent ? { content: about[key], sortOrder: idx } : {},
                create: { key, title: titles[key] || key, sortOrder: idx, enabled: true, content: about[key] }
            });
            idx += 1;
        }
    };

    // ==================== SITE SETTINGS ====================
    console.log('\n📝 Seeding site settings...');

    // Hero Section
    const heroValue = {
        headline: "Building Africa’s",
        headlineHighlight: "Digital Future",
        subheadline: "Through Software, Innovation, and Empowerment",
        tagline: "AngiSoft is a technology ecosystem building software platforms, automation systems, AI solutions, creator tools, data systems, and digital infrastructure for modern businesses and communities.",
        eyebrow: "Innovate • Build • Empower",
        ctaPrimary: { text: "Start Your Project", link: "/booking" },
        ctaSecondary: { text: "Explore Our Products", link: "/products" },

        slides: [

            {
                id: 0,
                type: 'video',
                video: '/videos/Matrix_rain_code.mp4',
                poster: '/uploads/public/images/Software-Development-Company.jpg',
                badge: 'AngiSoft Technologies',
                headline: 'Building Africa’s',
                headlineHighlight: 'Digital Future',
                tagline: 'From software engineering to automation and creator ecosystems, AngiSoft builds technology designed for real-world impact.',
                primaryCta: { label: 'Start Your Project', to: '/booking' },
                secondaryCta: { label: 'Explore Products', to: '/products' },
            },

            {
                id: 1,
                type: 'image',
                image: '/uploads/public/images/Software-Development-Company.jpg',
                badge: 'Our Products',
                headline: 'Purpose-Built',
                headlineHighlight: 'Software',
                tagline: 'PetroFlow, DukaFlow, KejaLink, AngiTunes — solutions designed for real business challenges.',
                primaryCta: { label: 'Explore Products', to: '/products' },
                secondaryCta: { label: 'See Services', to: '/services' },
            },
            {
                id: 2,
                type: 'image',
                image: '/uploads/public/images/programming-background-with-person-working-with-codes-computer.jpg',
                badge: 'Innovate. Build. Empower.',
                headline: 'Technology That',
                headlineHighlight: 'Moves Businesses',
                tagline: 'From fuel stations to property management — our platforms power industries across East Africa.',
                primaryCta: { label: 'Book a Consultation', to: '/book' },
                secondaryCta: { label: 'View Projects', to: '/projects' },
            },
            {
                id: 3,
                type: 'image',
                image: '/uploads/public/images/developer-8829735_1280.jpg',
                badge: 'Our Team',
                headline: 'Expert Developers,',
                headlineHighlight: 'Real Results',
                tagline: 'A passionate team delivering custom software, data analytics, and cybersecurity solutions.',
                primaryCta: { label: 'Meet the Team', to: '/staff' },
                secondaryCta: { label: 'Testimonials', to: '/testimonials' },
            },
    

            {
                id: 4,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-1-image-ef04f24e3d.jpg',
                badge: 'Software Engineering',
                headline: 'Scalable',
                headlineHighlight: 'Digital Systems',
                tagline: 'Web applications, enterprise dashboards, APIs, SaaS platforms, and business systems engineered for modern operations.',
                primaryCta: { label: 'View Services', to: '/services' },
                secondaryCta: { label: 'Book Consultation', to: '/booking' },
            },

            {
                id: 5,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-2-image-d38cea0e91.jpg',
                badge: 'Mobile Development',
                headline: 'Modern Apps for',
                headlineHighlight: 'Modern Africa',
                tagline: 'We build Android, iOS, and cross-platform mobile applications for businesses, creators, institutions, and digital ecosystems.',
                primaryCta: { label: 'Build an App', to: '/booking' },
                secondaryCta: { label: 'See Technologies', to: '/technologies' },
            },

            {
                id: 6,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-3-image-492996b936.jpg',
                badge: 'AI & Automation',
                headline: 'Smarter Workflows',
                headlineHighlight: 'Powered by AI',
                tagline: 'We help teams automate operations, generate insights, reduce repetitive work, and improve productivity through intelligent systems.',
                primaryCta: { label: 'Automate Workflow', to: '/booking' },
                secondaryCta: { label: 'Explore AI', to: '/services' },
            },

            {
                id: 7,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-4-image-00dd48572b.jpg',
                badge: 'Data & Analytics',
                headline: 'Transform Data Into',
                headlineHighlight: 'Business Insight',
                tagline: 'Dashboards, analytics, Excel automation, reporting systems, and data pipelines that help businesses make better decisions.',
                primaryCta: { label: 'Request Dashboard', to: '/booking' },
                secondaryCta: { label: 'View Data Services', to: '/services' },
            },

            {
                id: 8,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-5-image-b4a4625a97.jpg',
                badge: 'Digital Empowerment',
                headline: 'Technology That',
                headlineHighlight: 'Empowers People',
                tagline: 'We support developers, students, creators, entrepreneurs, artists, and businesses through technology, education, and innovation.',
                primaryCta: { label: 'Learn With Us', to: '/blog' },
                secondaryCta: { label: 'Meet the Team', to: '/staff' },
            },

            {
                id: 9,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-6-image-10d57800bf.jpg',
                badge: 'Product Ecosystem',
                headline: 'PetroFlow, DukaFlow,',
                headlineHighlight: 'KejaLink & AngiTunes',
                tagline: 'A growing ecosystem of products focused on retail, fuel operations, creator platforms, housing systems, and digital transformation.',
                primaryCta: { label: 'Explore Products', to: '/products' },
                secondaryCta: { label: 'View Success Stories', to: '/projects' },
            },

            {
                id: 10,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-7-image-c572fad272.jpg',
                badge: 'Business Transformation',
                headline: 'Helping Businesses',
                headlineHighlight: 'Go Digital',
                tagline: 'We help startups, SMEs, institutions, and growing companies move from manual operations to scalable digital systems.',
                primaryCta: { label: 'Digitize Your Business', to: '/booking' },
                secondaryCta: { label: 'See Solutions', to: '/solutions' },
            },

            {
                id: 11,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-8-image-7850d801bf.jpg',
                badge: 'Cloud & Infrastructure',
                headline: 'Infrastructure Built',
                headlineHighlight: 'to Scale',
                tagline: 'Cloud deployment, Docker, Linux servers, networking, MikroTik systems, CI/CD pipelines, and digital infrastructure management.',
                primaryCta: { label: 'Explore Infrastructure', to: '/services' },
                secondaryCta: { label: 'Talk to Experts', to: '/booking' },
            },

            {
                id: 12,
                type: 'image',
                image: '/uploads/public/images/cms/setting-site_hero-value-slides-9-image-9774f2a544.jpg',
                badge: 'Future Innovation',
                headline: 'Innovating for',
                headlineHighlight: 'Future Generations',
                tagline: 'AngiSoft is building technology ecosystems that educate, empower, automate, and create opportunities across Africa and beyond.',
                primaryCta: { label: 'Join the Journey', to: '/about' },
                secondaryCta: { label: 'Read Our Story', to: '/blog' },
            }
        ],

        stats: [
            { value: 2024, suffix: '', label: 'Founded', icon: 'FaSeedling' },
            { value: 10, suffix: '+', label: 'Core Services', icon: 'FaLayerGroup' },
            { value: 4, suffix: '+', label: 'Product Ecosystems', icon: 'FaRocket' },
            { value: 3, suffix: '', label: 'Innovate • Build • Empower', icon: 'FaHandsHelping' }
        ],

        backgroundVideo: "/videos/Matrix_rain_code.mp4",
        backgroundImage: "/uploads/public/images/Wallpapers/AngiSoft-Desktop-Wallpaper.png"
    };

    await seedSetting('site_hero', heroValue);
    console.log('  ✅ Hero settings');

    // About Section — ScienceSoft-style section structure, AngiSoft dark identity.
    // Image paths live under /uploads/public/images/about (served by the backend
    // and resolved via resolveAssetUrl on the frontend).
    // Canonical 26-key About-page contract. Source of truth is the frontend
    // hook's `defaultAbout` (generated into ./about-default-data). When that
    // generated file exists we use it directly; otherwise we keep a minimal
    // inline fallback so seeding never hard-fails.
    const aboutValue = aboutDefaultData?.defaultAbout ?? {
        heroSlides: [],
        intro: { enabled: true, eyebrow: 'About AngiSoft Technologies', headline: "Building Africa’s", highlightedHeadline: 'Digital Future', subtitle: 'Through Software, Innovation, and Empowerment', descriptor: 'A grassroots-origin African technology ecosystem', paragraph: 'Founded in December 2024, AngiSoft Technologies builds software products, custom systems, data solutions and practical digital services.', philosophy: 'Innovate → Build → Empower', primaryCta: { label: 'Schedule an Introductory Call', to: '/booking' }, secondaryCta: { label: 'Explore Our Services', to: '/services' } },
        numbersHeading: { enabled: true, eyebrow: 'AngiSoft in Numbers', title: 'AngiSoft in Numbers', description: 'A growing African technology ecosystem measured by real work, original products and practical impact.' },
        numberStories: [],
        geography: { enabled: true, intro: { title: 'Where We Work', description: 'AngiSoft serves clients across Kenya, East Africa and beyond from its Kisii base.' }, regions: [], mapImageUrl: '', mapImageAlt: '', sourceLabel: '', sourceUrl: '' },
        sustainability: { enabled: true, eyebrow: 'Sustainability & Social Responsibility', title: 'Technology with Responsibility', description: 'We build practical, ethical technology that supports inclusion, learning and community impact.', pillars: [] },
        collaboration: { enabled: true, eyebrow: 'How We Collaborate', title: 'How We Work With You', description: 'Clear communication and shared ownership from first conversation to ongoing support.', columns: [] },
        timelineHeading: { enabled: true, eyebrow: 'AngiSoft Highlights', title: 'AngiSoft Highlights', description: 'Key moments in our growth as a grassroots African technology company.' },
        timeline: [],
        industriesHeading: { enabled: true, eyebrow: 'Industries We Serve', title: 'Industries We Serve', description: 'Sector-focused digital solutions built around real operational needs.' },
        industries: [],
        clientsHeading: { enabled: true, eyebrow: 'Our Clients', title: 'Our Clients', description: 'Businesses, institutions and communities we are proud to support.' },
        clients: [],
        clientStats: { enabled: true, items: [] },
        clientHighlights: { enabled: true, items: [] },
        testimonialsHeading: { enabled: true, eyebrow: 'What Our Clients Say', title: 'What Our Clients Say', description: 'Real feedback from organisations and people we have worked with.' },
        serviceMap: { enabled: true, introTile: { title: 'Our Service Map', to: '/services' }, services: [] },
        transparency: { enabled: true, eyebrow: 'Building Trust with Transparency', title: 'Building Trust with Transparency', introduction: 'We earn trust through evidence, clarity and responsible delivery.', guarantees: [] },
        partnerships: { enabled: true, eyebrow: 'Partnerships & Recognitions', title: 'Partnerships and Recognitions', description: 'Enable this section when AngiSoft has approved public partnerships, certifications, memberships or recognitions.', items: [] },
        solutionTypes: { enabled: true, eyebrow: 'Solutions We Cover', title: 'From Focused Improvements to Complete Platforms', description: 'AngiSoft supports both targeted technical work and larger end-to-end digital solutions.', items: [] },
        technologies: { enabled: true, eyebrow: 'Capabilities & Technological Expertise', title: 'Capabilities and Technological Expertise', description: 'The tools and disciplines we use to build dependable software.', columns: [] },
        specializedCapabilities: { enabled: true, eyebrow: 'Specialized Technology Capabilities', title: 'Specialized Technology Capabilities', description: 'Advanced capabilities we invest in to solve harder problems.', items: [] },
        whyGuarantee: { enabled: true, eyebrow: 'What We Do to Guarantee Project Success', title: 'What We Do to Guarantee Project Success', introduction: 'Six practices keep our delivery honest, predictable and useful.', practices: [] },
        pricing: { enabled: true, eyebrow: 'Pricing Policy', title: 'Clear Pricing for the Work Required', description: 'Pricing depends on scope, complexity, timeline, integrations, support expectations and delivery model.', models: [] },
        pricingQuotation: { enabled: true },
        cta: { enabled: true, eyebrow: 'Innovate • Build • Empower', title: 'Let’s Build Your Next Digital Solution', description: 'Whether you need custom software, a digital product, data automation, an upgrade or dependable technical support, AngiSoft will help you turn the requirement into a practical working solution.', imageUrl: '/uploads/public/images/about/final-cta/build-with-angisoft.webp', imageAlt: 'Building digital solutions with AngiSoft Technologies', primaryCta: { label: 'Start a Project', to: '/booking' }, secondaryCta: { label: 'Talk to AngiSoft', to: '/contact' }, contact: { phone: '+254710398690', phoneLabel: '+254 710 398 690', email: 'info@angisoft.co.ke', whatsapp: '254710398690' }, reassurance: 'Clear communication • Practical solutions • Responsible delivery' }
    };

    const ABOUT_SCHEMA_VERSION_SEEDED = aboutDefaultData?.ABOUT_SCHEMA_VERSION ?? 3;

    await seedSetting('site_about', aboutValue);
    await seedAboutSections(aboutValue);
    console.log('  ✅ About settings (Setting + AboutSection rows)');

    // Contact Section
    await seedSetting('site_contact', {
        companyName: "AngiSoft Technologies",
        email: "info@angisoft.co.ke",
        phone: "+254710398690",
        whatsapp: "+254710398690",
        address: {
            street: "123 Tech Avenue",
            city: "Nairobi",
            country: "Kenya",
            postalCode: "00100"
        },
        hours: {
            weekdays: "Mon - Sat: 24/7 (Remote support available 24/7, in-person visits by appointment)",
            weekends: "Sun: 14:00 - 23:59 (Remote support available 24/7, in-person visits by appointment)",
            note: "Remote consultations and project support available by appointment"
        },
        social: {
            linkedin: "https://linkedin.com/company/angisoft-technologies",
            twitter: "https://x.com/angisofttech",
            github: "https://github.com/angisoft-technologies",
            facebook: "https://facebook.com/angisoft.technologies"
        }
    });
    console.log('  ✅ Contact settings');

    // Footer Section
    await seedSetting('site_footer', {
        description: "AngiSoft Technologies is a Kenyan-rooted technology ecosystem growing from practical grassroots support into scalable software products, SaaS platforms, and digital empowerment solutions.",
        columns: [
            {
                title: "Company",
                links: [
                    { label: "About AngiSoft", href: "/about" },
                    { label: "Careers", href: "/careers" },
                    { label: "Blog", href: "/blog" },
                    { label: "Contact", href: "/contact" }
                ]
            },
            {
                title: "Services",
                links: [
                    { label: "Custom Software", href: "/services" },
                    { label: "Data & Reports", href: "/services" },
                    { label: "Automation", href: "/services" },
                    { label: "Digital Services", href: "/services" }
                ]
            },
            {
                title: "Products",
                links: [
                    { label: "PetroFlow", href: "/products/petroflow" },
                    { label: "DukaFlow", href: "/products/dukaflow" },
                    { label: "KejaLink", href: "/products/kejalink" },
                    { label: "AngiTunes", href: "/products/angitunes" }
                ]
            }
        ],
        legalLinks: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" }
        ],
        newsletter: {
            enabled: true,
            title: "Learn and build with AngiSoft",
            description: "Get practical updates on software, data, automation, creator tools, and digital transformation."
        },
        copyright: "© {year} AngiSoft Technologies. Innovate • Build • Empower."
    });
    console.log('  ✅ Footer settings');

    const brandingValue = {
        themeId: "angisoft",
        mode: "dark",
        logo: "/uploads/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.svg",
        logoDark: "/uploads/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.svg",
        logoSymbol: "/uploads/public/images/Logos/AngiSoft-Logo-Symbol-Only.png",
        favicon: "/favicon.ico",
        siteName: "AngiSoft Technologies",
        motto: "Innovate \u2022 Build \u2022 Empower",
        tagline: "Grassroots-built technology for software, data, automation, creators, and digital empowerment",
        website: "www.angisoft.co.ke",
        email: "info@angisoft.co.ke",
        phone: "+254710398690",
        whatsapp: "+254710398690",
        location: "Nairobi, Kenya",
        colors: {
            primary: "#0875FF",
            primaryLight: "#3B9AFF",
            primaryDark: "#003BCE",
            secondary: "#00AFFF",
            secondaryLight: "#18D8FF",
            secondaryDark: "#0088CC",
            accent: "#18D8FF",
            success: "#27D94B",
            successDark: "#1EB83D",
            lime: "#5DFF62",
            navy: "#07142B",
            dark: "#061324",
            navyLight: "#0B1E3D",
            navyLighter: "#102A55",
            light: "#F5F7FA",
            gradient: "linear-gradient(135deg, #18D8FF 0%, #0875FF 45%, #003BCE 100%)",
            gradientBtn: "linear-gradient(135deg, #0875FF 0%, #00AFFF 100%)"
        }
    };

    await prisma.setting.upsert({
        where: { key: 'site_branding' },
        update: { value: brandingValue },
        create: {
            key: 'site_branding',
            value: brandingValue
        }
    });
    console.log('  ✅ Branding settings');

    // UI Copy (Headings, labels, CTAs)
    await prisma.setting.upsert({
        where: { key: 'site_ui' },
        update: {},
        create: {
            key: 'site_ui',
            value: {
                home: {
                    hero: {
                        welcomeLabel: 'Welcome to',
                        showreelLabel: 'Watch Our Showreel'
                    },
                    about: {
                        badge: 'About Us',
                        storyLabel: 'Our Story',
                        valuesTitle: 'Our Core Values',
                        valuesSubtitle: 'The principles that guide everything we do'
                    },
                    services: {
                        badge: 'Our Services',
                        title: 'What We Offer',
                        subtitle: 'Custom software, data analysis, cyber services, and more.',
                        cta: {
                            title: 'Ready to Start Your Project?',
                            subtitle: 'Tell us about your idea and we will map the next steps.',
                            primaryLabel: 'View All Services',
                            primaryLink: '/services',
                            secondaryLabel: 'Get Free Quote',
                            secondaryLink: '/book'
                        }
                    },
                    projects: {
                        badge: 'Our Portfolio',
                        title: 'Featured Projects',
                        subtitle: 'Explore our latest work',
                        ctaLabel: 'View All Projects'
                    },
                    blog: {
                        badge: 'Our Blog',
                        title: 'Latest Insights',
                        subtitle: 'Thoughts, tutorials, and updates from our team.',
                        ctaLabel: 'View All Articles',
                        featuredLabel: 'Featured',
                        readLabel: 'Read'
                    },
                    testimonials: {
                        badge: 'Testimonials',
                        title: 'What Our Clients Say',
                        subtitle: 'Trusted by businesses across the region'
                    },
                    team: {
                        badge: 'Our Team',
                        title: 'Meet the Experts',
                        subtitle: 'A talented team across software, data, and operations',
                        ctaLabel: 'View Full Team'
                    },
                    contact: {
                        badge: 'Get In Touch',
                        title: 'Contact Us',
                        subtitle: 'Have a project in mind? Let us talk.',
                        introTitle: "Let's Talk",
                        introSubtitle: 'We respond within 24 hours.'
                    },
                    skills: {
                        title: 'Technologies We Use',
                        subtitle: 'We build with modern, reliable stacks.'
                    }
                },
                pages: {
                    services: {
                        badge: 'Our Expertise',
                        title: 'Our Services',
                        subtitle: 'Software, data, cyber, and advertising solutions built for your goals.',
                        featureBadges: ['Custom Software', 'Data Analysis', 'Cyber Services', 'Advertising']
                    },
                    projects: {
                        badge: 'Portfolio',
                        title: 'Our Projects',
                        subtitle: 'Discover the solutions we have delivered.',
                        stats: {
                            totalLabel: 'Total Projects',
                            categoriesLabel: 'Categories',
                            featuredLabel: 'Featured'
                        },
                        emptyMessage: 'No projects found in this category.',
                        cta: {
                            title: 'Have a Project in Mind?',
                            subtitle: 'Let us collaborate on your next release.',
                            primaryLabel: 'Start a Project',
                            primaryLink: '/book',
                            secondaryLabel: 'Contact Us',
                            secondaryLink: '/#contact'
                        }
                    },
                    blog: {
                        badge: 'Blog',
                        title: 'Insights & Updates',
                        subtitle: 'News, guides, and announcements from our team.',
                        ctaLabel: 'View All Articles'
                    },
                    testimonials: {
                        badge: 'Client Reviews',
                        title: 'What Our Clients Say',
                        subtitle: 'Real feedback from teams we have supported.',
                        stats: {
                            clientsLabel: 'Happy Clients',
                            ratingLabel: 'Avg Rating',
                            satisfactionLabel: 'Satisfaction'
                        }
                    },
                    staff: {
                        badge: 'Meet the Team',
                        title: 'Our Team',
                        subtitle: 'The talent behind our solutions.',
                        stats: {
                            teamLabel: 'Team Members',
                            departmentsLabel: 'Departments',
                            experienceLabel: 'Years Experience',
                            experienceValue: '5+'
                        }
                    }
                }
            }
        }
    });
    console.log('  ✅ UI copy settings');

    await seedSetting('site_navigation', {
        megaMenus: [
            {
                label: 'About',
                icon: 'FaInfoCircle',
                items: [
                    { label: 'About Us', description: 'Our story, mission, and the team behind AngiSoft Technologies.', href: '/about', icon: 'FaInfoCircle' },
                    { label: 'Our Team', description: 'Meet the engineers, designers, and strategists driving innovation.', href: '/staff', icon: 'FaBriefcase' },
                    { label: 'Careers', description: 'Join our growing team and build impactful software with us.', href: '/careers', icon: 'FaGraduationCap' }
                ]
            },
            {
                label: 'Services',
                icon: 'FaBriefcase',
                items: [
                    { label: 'All Services', href: '/services', icon: 'FaConciergeBell', description: 'Explore our full range of software, data, automation, and digital services.' },
                    { label: 'Web Development', href: '/services/web-development', icon: 'FaCode', description: 'Custom web applications and platforms built to solve real problems.' },
                    { label: 'Mobile Development', href: '/services/mobile-development', icon: 'FaMobileAlt', description: 'Native and cross-platform mobile applications for iOS and Android.' },
                    { label: 'Code Debugging', href: '/services/code-debugging', icon: 'FaBug', description: 'Find, fix and prevent bugs across your existing codebase.' },
                    { label: 'Data Analysis', href: '/services/data-analysis', icon: 'FaChartLine', description: 'Dashboards, reports and insights from your business data.' },
                    { label: 'Document Editing', href: '/services/document-editing', icon: 'FaFileAlt', description: 'Reports, theses, posters and professional document work.' },
                    { label: 'System & Database Design', href: '/services/database-design', icon: 'FaDatabase', description: 'Schemas, migrations and database architecture.' },
                    { label: 'Custom Systems', href: '/services/custom-systems', icon: 'FaServer', description: 'Bespoke software tailored to your workflows.' },
                    { label: 'Software Installation', href: '/services/software-installation', icon: 'FaDesktop', description: 'Setup, configuration and rollout of business software.' },
                    { label: 'System Upgrades', href: '/services/system-upgrades', icon: 'FaArrowUp', description: 'Modernize and upgrade legacy systems safely.' },
                    { label: 'Graphic Design', href: '/services/graphic-design', icon: 'FaPaintBrush', description: 'Posters, branding and visual design work.' },
                    { label: 'Online Applications', href: '/services/online-applications', icon: 'FaGlobe', description: 'Forms, portals and online submission systems.' },
                    { label: 'In-House Products', href: '/products', icon: 'FaBoxOpen', description: 'Ready-made products built and maintained by AngiSoft.' },
                ]
            },
            {
                label: 'Industries',
                icon: 'FaGlobe',
                items: [
                    { label: 'Retail and SMEs', href: '/industries/retail', icon: 'FaShoppingCart', description: 'POS, stock, sales and business-management workflows.' },
                    { label: 'Education', href: '/industries/education', icon: 'FaGraduationCap', description: 'School management, learning and student-support systems.' },
                    { label: 'Real Estate', href: '/industries/real-estate', icon: 'FaHome', description: 'Property discovery, management and stakeholder coordination.' },
                    { label: 'Fuel & Energy', href: '/industries/fuel-energy', icon: 'FaWarehouse', description: 'Station, pump and energy operations tooling.' },
                    { label: 'Healthcare', href: '/industries/healthcare', icon: 'FaHeartbeat', description: 'EHR/EMR, patient portals and hospital management.' },
                    { label: 'Telecommunications', href: '/industries/telecommunications', icon: 'FaWifi', description: 'ISP billing, network monitoring and customer-service platforms.' },
                    { label: 'Finance', href: '/industries/finance', icon: 'FaUniversity', description: 'Payment processing, financial dashboards and compliance reporting.' },
                    { label: 'eCommerce', href: '/industries/ecommerce', icon: 'FaStore', description: 'Online stores, POS, inventory and order fulfilment.' },
                    { label: 'Creative Industries', href: '/industries/creative', icon: 'FaPaintBrush', description: 'Digital platforms for artists, DJs and content distribution.' },
                    { label: 'Professional Services', href: '/industries/professional-services', icon: 'FaBriefcase', description: 'Operational systems, documents, reporting and digital workflows.' },
                    { label: 'Hospitality', href: '/industries/hospitality', icon: 'FaConciergeBell', description: 'Booking, customer-service and operations tooling.' },
                    { label: 'Transport & Logistics', href: '/industries/transport-logistics', icon: 'FaTruck', description: 'Fleet, dispatch, tracking and coordination workflows.' },
                ]
            },
            {
                label: 'Solutions',
                icon: 'FaPuzzlePiece',
                items: [
                    { label: 'All Solutions', href: '/solutions', icon: 'FaConciergeBell', description: 'Explore our tailored solutions for various business needs and challenges.' },
                    { label: 'Business Management', href: '/solutions/business-management', icon: 'FaCogs', description: 'Practical operations and management systems.' },
                    { label: 'Point of Sale', href: '/solutions/point-of-sale', icon: 'FaCashRegister', description: 'Retail and restaurant POS with stock and reporting.' },
                    { label: 'Customer Management', href: '/solutions/customer-management', icon: 'FaUsers', description: 'CRM and customer-support workflows.' },
                    { label: 'Operations Management', href: '/solutions/operations-management', icon: 'FaClipboardList', description: 'Scheduling, tasks and process automation.' },
                    { label: 'Financial Tracking', href: '/solutions/financial-tracking', icon: 'FaChartLine', description: 'Budgets, expenses and financial reporting.' },
                    { label: 'Payments & Billing', href: '/solutions/payments-billing', icon: 'FaCreditCard', description: 'Invoicing, billing and payment collection.' },
                    { label: 'Asset Management', href: '/solutions/asset-management', icon: 'FaWarehouse', description: 'Track and maintain physical and digital assets.' },
                    { label: 'Document Management', href: '/solutions/document-management', icon: 'FaFileContract', description: 'Document storage, versioning and workflows.' },
                    { label: 'Staff Portals', href: '/solutions/staff-portals', icon: 'FaUserTie', description: 'Employee self-service and HR portals.' },
                    { label: 'HR Systems', href: '/solutions/human-resource-systems', icon: 'FaUsers', description: 'Recruitment, payroll and people operations.' },
                    { label: 'Learning Platforms', href: '/solutions/learning-platforms', icon: 'FaChalkboardTeacher', description: 'Training, courses and student information systems.' },
                    { label: 'eCommerce', href: '/solutions/ecommerce', icon: 'FaStore', description: 'Online stores and catalog management.' },
                    { label: 'Inventory Management', href: '/solutions/inventory-management', icon: 'FaBoxes', description: 'Stock, warehouses and procurement.' },
                    { label: 'Property Platforms', href: '/products/kejalink', icon: 'FaBuilding', description: 'Property and rental management platforms.' },
                    { label: 'Data Analytics', href: '/services/data-analysis', icon: 'FaBrain', description: 'Dashboards, reports and data insights.' },
                    { label: 'Web Portals', href: '/solutions/web-portals', icon: 'FaGlobe', description: 'Client, member and partner portals.' },
                ]
            },

        ],
        simpleLinks: [
            { label: 'Pricing', href: '/pricing' },
            { label: 'Learning', href: '/blog' },
        ],
        cta: { label: 'Contact', href: '/contact' }

    });
    console.log('  ✅ Navigation settings');

    await seedSetting('site_home_content', {
        servicesIntro: {
            badge: 'What We Build',
            title: 'Practical Technology for Real Businesses and Communities',
            subtitle:
                'From software engineering and mobile apps to AI, data systems, infrastructure, creator platforms, and business automation — AngiSoft builds solutions that solve real-world problems.'
        },

        solutions: [
            {
                name: 'Enterprise Solutions',
                bgImage: '/uploads/public/images/services/enterprise.jpg',
                items: [
                    { icon: 'FaBuilding', name: 'Enterprise Applications' },
                    { icon: 'FaCogs', name: 'ERP Systems' },
                    { icon: 'FaUsers', name: 'CRM Platforms' },
                    { icon: 'FaUsers', name: 'HR Management Systems' },
                    { icon: 'FaFileAlt', name: 'Document Management' },
                    { icon: 'FaMoneyBillWave', name: 'Invoicing & Billing' }
                ]
            },
            {
                name: 'Web & Mobile',
                bgImage: '/uploads/public/images/services/web-mobile.jpg',
                items: [
                    { icon: 'FaGlobe', name: 'Web Portals' },
                    { icon: 'FaMobileAlt', name: 'Mobile Applications' },
                    { icon: 'FaLaptopCode', name: 'SaaS Platforms' },
                    { icon: 'FaChartBar', name: 'Progressive Web Apps' },
                    { icon: 'FaDatabase', name: 'API & Microservices' },
                    { icon: 'FaBrain', name: 'AI-Powered Interfaces' }
                ]
            },
            {
                name: 'Industry Solutions',
                bgImage: '/uploads/public/images/services/industry.jpg',
                items: [
                    { icon: 'FaNetworkWired', name: 'ISP Billing & Portals' },
                    { icon: 'FaSchool', name: 'School Management Systems' },
                    { icon: 'FaChartBar', name: 'Analytics Dashboards' },
                    { icon: 'FaMusic', name: 'AngiMusic Platform' },
                    { icon: 'FaBuilding', name: 'Property Management' },
                    { icon: 'FaShieldAlt', name: 'Security Platforms' }
                ]
            }
        ],

        techTrends: [
            {
                name: 'Artificial Intelligence',
                icon: 'FaBrain',
                bgImage: '/uploads/public/images/services/ai-bg.jpg',
                desc:
                    'We integrate machine learning, natural language processing, and intelligent automation into business applications — from smart chatbots to predictive analytics and AI-assisted workflows.',
                caps: [
                    'AI Chatbot Development',
                    'Predictive Analytics & Forecasting',
                    'Natural Language Processing',
                    'Computer Vision & Image Recognition',
                    'AI-Powered Document Processing',
                    'Recommendation Engines'
                ]
            },
            {
                name: 'Cloud',
                icon: 'FaCloud',
                bgImage: '/uploads/public/images/services/cloud-bg.jpg',
                desc:
                    'We design, deploy, and manage scalable cloud infrastructure on platforms such as AWS, Azure, and DigitalOcean, helping applications grow securely and reliably.',
                caps: [
                    'Cloud Migration Strategy',
                    'Microservices Architecture',
                    'Serverless Functions',
                    'CI/CD Pipeline Setup',
                    'Auto-Scaling Infrastructure',
                    'Multi-Cloud Deployments'
                ]
            },
            {
                name: 'Big Data',
                icon: 'FaDatabase',
                bgImage: '/uploads/public/images/services/bigdata-bg.jpg',
                desc:
                    'We transform raw data into useful business insight using dashboards, ETL pipelines, real-time analytics, reports, and decision-support systems.',
                caps: [
                    'Custom BI Dashboards',
                    'ETL Pipeline Development',
                    'Real-Time Data Processing',
                    'Data Warehouse Design',
                    'Excel & Power BI Reporting',
                    'Data Quality & Governance'
                ]
            },
            {
                name: 'Automation',
                icon: 'FaRobot',
                bgImage: '/uploads/public/images/services/automation-bg.jpg',
                desc:
                    'We automate repetitive tasks and complex workflows using scripts, integrations, reporting tools, notifications, and process orchestration so teams can focus on higher-value work.',
                caps: [
                    'Workflow Automation',
                    'Bash & Shell Scripting',
                    'Report Generation',
                    'Data Entry Automation',
                    'Email & Notification Systems',
                    'Legacy System Integration'
                ]
            },
            {
                name: 'Cybersecurity',
                icon: 'FaLock',
                bgImage: '/uploads/public/images/services/security-bg.jpg',
                desc:
                    'We help protect digital systems by embedding security into code, infrastructure, access control, data protection, and user awareness.',
                caps: [
                    'Security Code Reviews',
                    'Vulnerability Assessments',
                    'Compliance Auditing',
                    'Incident Response Planning',
                    'Data Encryption & Protection',
                    'Security Awareness Training'
                ]
            }
        ],

        contact: {
            title: 'Tell Us What You Are Building',
            subtitle:
                'Whether it is a business system, mobile app, SaaS product, dashboard, automation workflow, networking setup, creator platform, or digital transformation idea, AngiSoft can help you map the next step.',
            successMessage:
                'Thanks for reaching out. AngiSoft will review your request and respond with practical next steps.'
        }
    });

    console.log('  ✅ Home content settings');

    await seedSetting('site_industries', {
        badge: 'Industries We Serve',
        title: 'Digital systems for real industry workflows',
        subtitle: 'AngiSoft applies software, data, automation, and platform thinking to the sectors where practical technology can improve operations.',
        industries: [
            {
                name: 'Healthcare',
                icon: 'FaHeartbeat',
                bgImage: '/uploads/public/images/services/healthcare-bg.jpg',
                services: [
                    { icon: 'FaStethoscope', name: 'EHR/EMR Systems' },
                    { icon: 'FaUserMd', name: 'Patient Portals' },
                    { icon: 'FaHospital', name: 'Hospital Management' },
                    { icon: 'FaPills', name: 'Pharmacy Management' },
                    { icon: 'FaCalendarCheck', name: 'Appointment Scheduling' },
                    { icon: 'FaChartPie', name: 'Health Analytics' }
                ]
            },
            {
                name: 'Finance',
                icon: 'FaUniversity',
                bgImage: '/uploads/public/images/services/finance-bg.jpg',
                services: [
                    { icon: 'FaCreditCard', name: 'Payment Processing' },
                    { icon: 'FaChartPie', name: 'Financial Dashboards' },
                    { icon: 'FaWallet', name: 'Mobile Banking' },
                    { icon: 'FaMoneyBillWave', name: 'Loan Management' },
                    { icon: 'FaShieldAlt', name: 'Fraud Detection' },
                    { icon: 'FaFileContract', name: 'Compliance Reporting' }
                ]
            },
            {
                name: 'Education',
                icon: 'FaGraduationCap',
                bgImage: '/uploads/public/images/services/education-bg.jpg',
                services: [
                    { icon: 'FaSchool', name: 'School Management' },
                    { icon: 'FaLaptopCode', name: 'E-Learning Platforms' },
                    { icon: 'FaChalkboardTeacher', name: 'Virtual Classrooms' },
                    { icon: 'FaBook', name: 'Content Management' },
                    { icon: 'FaChartPie', name: 'Student Analytics' },
                    { icon: 'FaClipboardList', name: 'Examination Systems' }
                ]
            },
            {
                name: 'Real Estate',
                icon: 'FaHome',
                bgImage: '/uploads/public/images/services/realestate-bg.jpg',
                services: [
                    { icon: 'FaBuilding', name: 'Property Management' },
                    { icon: 'FaKey', name: 'Tenant Portals' },
                    { icon: 'FaWarehouse', name: 'Inventory Tracking' },
                    { icon: 'FaClipboardList', name: 'Lease Management' },
                    { icon: 'FaCalculator', name: 'Rent Collection' },
                    { icon: 'FaDrawPolygon', name: 'Virtual Tours' }
                ]
            },
            {
                name: 'Retail & eCommerce',
                icon: 'FaShoppingCart',
                bgImage: '/uploads/public/images/services/retail-bg.jpg',
                services: [
                    { icon: 'FaBarcode', name: 'POS Systems' },
                    { icon: 'FaStore', name: 'Online Stores' },
                    { icon: 'FaReceipt', name: 'Inventory Management' },
                    { icon: 'FaTags', name: 'Loyalty Programs' },
                    { icon: 'FaChartPie', name: 'Sales Analytics' },
                    { icon: 'FaTruckLoading', name: 'Order Fulfillment' }
                ]
            },
            {
                name: 'Telecommunications',
                icon: 'FaNetworkWired',
                bgImage: '/uploads/public/images/services/telecom-bg.jpg',
                services: [
                    { icon: 'FaWifi', name: 'ISP Billing' },
                    { icon: 'FaSignal', name: 'Network Monitoring' },
                    { icon: 'FaServer', name: 'Infrastructure Mgmt' },
                    { icon: 'FaHeadset', name: 'Customer Portals' },
                    { icon: 'FaChartPie', name: 'Usage Analytics' },
                    { icon: 'FaClipboardList', name: 'Service Provisioning' }
                ]
            }
        ],
        moreIndustries: [
            {
                name: 'Logistics',
                icon: 'FaTruck',
                bgImage: '/uploads/public/images/services/telecom-bg.jpg',
                services: [
                    { icon: 'FaRoute', name: 'Route Optimization' },
                    { icon: 'FaBoxes', name: 'Warehouse Management' },
                    { icon: 'FaTruckLoading', name: 'Fleet Tracking' },
                    { icon: 'FaClipboardList', name: 'Order Management' }
                ]
            },
            {
                name: 'Construction',
                icon: 'FaHardHat',
                bgImage: '/uploads/public/images/services/enterprise.jpg',
                services: [
                    { icon: 'FaRulerCombined', name: 'Project Tracking' },
                    { icon: 'FaDrawPolygon', name: 'BIM Integration' },
                    { icon: 'FaClipboardList', name: 'Safety Management' },
                    { icon: 'FaCalculator', name: 'Cost Estimation' }
                ]
            },
            {
                name: 'Professional Services',
                icon: 'FaBriefcase',
                bgImage: '/uploads/public/images/services/it-consulting.jpg',
                services: [
                    { icon: 'FaUserTie', name: 'CRM Systems' },
                    { icon: 'FaFileContract', name: 'Contract Management' },
                    { icon: 'FaCalculator', name: 'Billing & Invoicing' },
                    { icon: 'FaHandshake', name: 'Client Portals' }
                ]
            },
            {
                name: 'Entertainment & Music',
                icon: 'FaMusic',
                bgImage: '/uploads/public/images/services/ai-automation.jpg',
                services: [
                    { icon: 'FaMusic', name: 'Distribution Platforms' },
                    { icon: 'FaChartPie', name: 'Royalty Tracking' },
                    { icon: 'FaLaptopCode', name: 'Streaming Systems' },
                    { icon: 'FaClipboardList', name: 'Rights Management' }
                ]
            }
        ]
    });
    console.log('  ✅ Industry settings');

    await seedSetting('site_tech_platforms', {
        badge: 'Technology Stack',
        title: 'Technologies we use and teach',
        subtitle: 'AngiSoft works across frontend, backend, mobile, databases, cloud, DevOps, AI, and data tooling depending on the product or service need.',
        categories: [
            {
                name: 'Frontend',
                items: [
                    { name: 'React', icon: 'FaReact', color: '#61DAFB' },
                    { name: 'Vue.js', icon: 'SiVuedotjs', color: '#4FC08D' },
                    { name: 'Angular', icon: 'SiAngular', color: '#DD0031' },
                    { name: 'Next.js', icon: 'SiNextdotjs', color: '#fff' },
                    { name: 'TypeScript', icon: 'SiTypescript', color: '#3178C6' },
                    { name: 'JavaScript', icon: 'FaJs', color: '#F7DF1E' },
                    { name: 'HTML5', icon: 'FaHtml5', color: '#E34F26' },
                    { name: 'Tailwind CSS', icon: 'SiTailwindcss', color: '#06B6D4' }
                ]
            },
            {
                name: 'Backend',
                items: [
                    { name: 'Node.js', icon: 'FaNodeJs', color: '#339933' },
                    { name: 'Python', icon: 'FaPython', color: '#3776AB' },
                    { name: 'Laravel', icon: 'SiLaravel', color: '#FF2D20' },
                    { name: 'Django', icon: 'SiDjango', color: '#092E20' },
                    { name: 'Spring Boot', icon: 'SiSpringboot', color: '#6DB33F' },
                    { name: 'PHP', icon: 'FaPhp', color: '#777BB4' },
                    { name: 'GraphQL', icon: 'SiGraphql', color: '#E10098' },
                    { name: 'Java', icon: 'FaJava', color: '#007396' }
                ]
            },
            {
                name: 'Mobile Development',
                items: [
                    { name: 'Flutter', icon: 'SiFlutter', color: '#02569B' },
                    { name: 'React Native', icon: 'FaReact', color: '#61DAFB' },
                    { name: 'Kotlin', icon: 'SiKotlin', color: '#7F52FF' },
                    { name: 'Android', icon: 'FaAndroid', color: '#3DDC84' },
                    { name: 'iOS', icon: 'FaApple', color: '#fff' }
                ]
            },
            {
                name: 'Databases',
                items: [
                    { name: 'PostgreSQL', icon: 'SiPostgresql', color: '#4169E1' },
                    { name: 'MongoDB', icon: 'SiMongodb', color: '#47A248' },
                    { name: 'MySQL', icon: 'SiMysql', color: '#4479A1' },
                    { name: 'Firebase', icon: 'SiFirebase', color: '#FFCA28' },
                    { name: 'Redis', icon: 'SiRedis', color: '#DC382D' }
                ]
            },
            {
                name: 'Cloud & DevOps',
                items: [
                    { name: 'AWS', icon: 'FaAws', color: '#FF9900' },
                    { name: 'Docker', icon: 'FaDocker', color: '#2496ED' },
                    { name: 'Kubernetes', icon: 'SiKubernetes', color: '#326CE5' },
                    { name: 'Linux', icon: 'FaLinux', color: '#FCC624' },
                    { name: 'Nginx', icon: 'SiNginx', color: '#009639' },
                    { name: 'Terraform', icon: 'SiTerraform', color: '#7B42BC' },
                    { name: 'Git', icon: 'FaGitAlt', color: '#F05032' }
                ]
            },
            {
                name: 'AI & Data',
                items: [
                    { name: 'TensorFlow', icon: 'SiTensorflow', color: '#FF6F00' },
                    { name: 'OpenAI', icon: 'SiOpenai', color: '#412991' },
                    { name: 'Python', icon: 'FaPython', color: '#3776AB' },
                    { name: 'Power BI', icon: 'FaChartBar', color: '#F2C811' },
                    { name: 'Stripe', icon: 'SiStripe', color: '#635BFF' },
                    { name: 'Azure', icon: 'FaMicrosoft', color: '#0078D4' }
                ]
            }
        ]
    });
    console.log('  ✅ Tech platform settings');

    await seedSetting('site_success_stories', {
        badge: 'Product Direction',
        title: 'AngiSoft product ecosystems',
        subtitle: 'These products show how AngiSoft is evolving from service delivery into scalable software ecosystems.',
        stories: [
            { productSlug: 'petroflow', title: 'PetroFlow', headline: 'Fuel station operations made trackable', excerpt: 'A petroleum management direction for stock, shifts, sales, reporting, and station workflows.', status: 'DEVELOPMENT', year: '2026' },
            { productSlug: 'dukaflow', title: 'DukaFlow', headline: 'Retail management for local businesses', excerpt: 'A shop and SME operations platform for inventory, sales, customers, and business records.', status: 'DEVELOPMENT', year: '2026' },
            { productSlug: 'kejalink', title: 'KejaLink', headline: 'Property and rental workflow support', excerpt: 'A housing/rental ecosystem for listings, tenants, communication, and property records.', status: 'PLANNED', year: '2026' },
            { productSlug: 'angitunes', title: 'AngiTunes', headline: 'Creator and music distribution ecosystem', excerpt: 'A platform direction for DJs, artists, and creators to distribute and monetize digital content affordably.', status: 'PLANNED', year: '2026' }
        ]
    });
    console.log('  ✅ Success story settings');

    await seedSetting('site_pricing', {
        badge: 'Transparent Solution Pricing',

        title: 'Flexible Pricing Based on Your Real Requirements',

        subtitle:
            'Every software project is different. Pricing depends on features, integrations, infrastructure, scalability, timelines, automation needs, security requirements, and long-term business goals.',

        intro: {
            title: 'How AngiSoft Pricing Works',
            description:
                'Instead of using one fixed price for every project, AngiSoft breaks down pricing based on the actual work, systems, technologies, infrastructure, integrations, and business requirements involved.'
        },

        pricingFactors: [
            {
                title: 'Project Type',
                description:
                    'Different solutions require different levels of engineering, architecture, testing, and infrastructure.',
                examples: [
                    'Business websites',
                    'Mobile applications',
                    'SaaS platforms',
                    'POS systems',
                    'ERP systems',
                    'Creator platforms',
                    'AI-powered systems',
                    'Dashboards and analytics'
                ]
            },

            {
                title: 'Features & Functionality',
                description:
                    'The number and complexity of features directly affect development time and project scope.',
                examples: [
                    'Authentication & user accounts',
                    'Admin dashboards',
                    'Payment integrations',
                    'Notifications & messaging',
                    'Real-time systems',
                    'AI integrations',
                    'Role & permission systems',
                    'Analytics and reporting'
                ]
            },

            {
                title: 'Platforms Supported',
                description:
                    'Pricing changes depending on whether the solution targets web, Android, iOS, desktop, cloud, or multiple platforms together.',
                examples: [
                    'Web applications',
                    'Android apps',
                    'iOS apps',
                    'Cross-platform apps',
                    'Desktop systems',
                    'Cloud platforms'
                ]
            },

            {
                title: 'Integrations',
                description:
                    'Connecting external systems and APIs increases architecture, testing, security, and maintenance requirements.',
                examples: [
                    'M-Pesa integration',
                    'PayPal and Stripe',
                    'Email systems',
                    'SMS gateways',
                    'Cloud storage',
                    'Third-party APIs',
                    'Google services',
                    'ERP integrations'
                ]
            },

            {
                title: 'Infrastructure & Deployment',
                description:
                    'Infrastructure planning and deployment requirements affect scalability, performance, reliability, and operational cost.',
                examples: [
                    'Cloud hosting',
                    'Docker deployment',
                    'Kubernetes setup',
                    'CI/CD pipelines',
                    'Server administration',
                    'Database scaling',
                    'Networking setup',
                    'Backup systems'
                ]
            },

            {
                title: 'Support & Maintenance',
                description:
                    'Some businesses require continuous updates, technical support, monitoring, optimization, and scaling assistance.',
                examples: [
                    'Bug fixes',
                    'Feature improvements',
                    'Performance optimization',
                    'Security updates',
                    'Infrastructure monitoring',
                    'Technical support'
                ]
            }
        ],

        estimatedRanges: [
            {
                category: 'Business Websites & Portals',
                startingFrom: 25000,
                currency: 'KES',
                description:
                    'Professional websites, company profiles, landing pages, client portals, and informational platforms.',
                includes: [
                    'Responsive UI',
                    'CMS integration',
                    'SEO-friendly structure',
                    'Admin management',
                    'Deployment support'
                ]
            },

            {
                category: 'Business Systems & Dashboards',
                startingFrom: 80000,
                currency: 'KES',
                description:
                    'POS systems, inventory management, dashboards, booking systems, reporting platforms, and operational tools.',
                includes: [
                    'Authentication systems',
                    'Admin dashboards',
                    'Reports and analytics',
                    'Role management',
                    'Database systems'
                ]
            },

            {
                category: 'Mobile Applications',
                startingFrom: 120000,
                currency: 'KES',
                description:
                    'Android, iOS, and cross-platform mobile applications built for businesses, creators, startups, and institutions.',
                includes: [
                    'Cross-platform UI',
                    'Backend integration',
                    'Push notifications',
                    'Authentication',
                    'App deployment guidance'
                ]
            },

            {
                category: 'Custom SaaS Platforms',
                startingFrom: 250000,
                currency: 'KES',
                description:
                    'Scalable SaaS ecosystems, automation platforms, AI systems, enterprise applications, and cloud-based products.',
                includes: [
                    'System architecture',
                    'Custom APIs',
                    'Cloud infrastructure',
                    'Advanced security',
                    'Scalable databases',
                    'Automation workflows'
                ]
            },

            {
                category: 'Infrastructure & Networking',
                startingFrom: 50000,
                currency: 'KES',
                description:
                    'Cloud systems, MikroTik networking, ISP systems, Docker infrastructure, Linux administration, and deployment pipelines.',
                includes: [
                    'Cloud deployment',
                    'Networking configuration',
                    'Monitoring systems',
                    'Infrastructure security',
                    'Backup planning'
                ]
            }
        ],

        engagementModels: [
            {
                title: 'Fixed Scope Projects',
                description:
                    'Best for clearly defined projects with specific deliverables, timelines, and milestones.'
            },

            {
                title: 'Dedicated Team Model',
                description:
                    'Ideal for startups and growing businesses needing continuous development and scaling.'
            },

            {
                title: 'Consulting & Advisory',
                description:
                    'Technology guidance, digital transformation planning, architecture reviews, and infrastructure strategy.'
            }
        ],

        process: [
            {
                step: '1',
                title: 'Discovery & Consultation',
                description:
                    'We understand your goals, workflows, users, challenges, and requirements.'
            },

            {
                step: '2',
                title: 'Requirements & Scope Analysis',
                description:
                    'We analyze features, integrations, infrastructure, timelines, and technical complexity.'
            },

            {
                step: '3',
                title: 'Proposal & Cost Breakdown',
                description:
                    'You receive a detailed breakdown showing what is being built, estimated timelines, and pricing structure.'
            },

            {
                step: '4',
                title: 'Development & Delivery',
                description:
                    'We begin implementation using modern engineering workflows, testing, and deployment practices.'
            }
        ],

        faq: [
            {
                question: 'Why do software prices vary?',
                answer:
                    'Different projects require different technologies, architectures, integrations, security levels, infrastructure, and development effort.'
            },

            {
                question: 'Can I start small and scale later?',
                answer:
                    'Yes. Many systems are designed in phases so businesses can launch early and expand features over time.'
            },

            {
                question: 'Do you support startups and SMEs?',
                answer:
                    'Yes. AngiSoft works with startups, SMEs, institutions, creators, and growing businesses.'
            },

            {
                question: 'Do you offer ongoing support?',
                answer:
                    'Yes. We provide maintenance, scaling support, optimization, infrastructure management, and long-term technical assistance.'
            }
        ],

        cta: {
            title: 'Let’s Discuss Your Project',
            subtitle:
                'Tell us about your business, idea, workflow, or digital challenge and we will help map the right solution and pricing approach.',
            primaryButton: {
                label: 'Request Consultation',
                url: '/booking'
            },
            secondaryButton: {
                label: 'Explore Services',
                url: '/services'
            }
        }
    });

    console.log('  ✅ Pricing settings');

    await seedSetting('site_booking', {
        hero: {
            badge: 'Start a Consultation',
            title: 'Tell Us About Your',
            highlight: 'Project',
            subtitle:
                'Share your idea, business challenge, workflow, or digital product need. AngiSoft will review your request and help map the right solution, scope, timeline, and pricing approach.'
        },

        intro: {
            title: 'How Booking Works',
            description:
                'Booking is not just about submitting a task. It begins a discovery process where we understand your goals, users, features, integrations, infrastructure, and expected outcomes before preparing a clear proposal.'
        },

        success: {
            title: 'Request Submitted Successfully',
            message:
                'AngiSoft has received your request. Our team will review your requirements and respond with practical next steps, possible engagement options, and any clarifications needed.'
        },

        labels: {
            next: 'Next',
            back: 'Back',
            submit: 'Submit Request',
            submitting: 'Submitting...',
            viewStatus: 'Track Request',
            returnHome: 'Return Home',
            saveDraft: 'Save Draft',
            continueLater: 'Continue Later'
        },

        steps: [
            {
                title: 'Basic Information',
                icon: 'FaUser',
                description: 'Tell us who you are and how we can contact you.'
            },
            {
                title: 'Project Type',
                icon: 'FaLayerGroup',
                description: 'Choose the type of solution, service, or support you need.'
            },
            {
                title: 'Requirements & Goals',
                icon: 'FaFileAlt',
                description: 'Describe what you want to build, improve, automate, analyze, or solve.'
            },
            {
                title: 'Files & References',
                icon: 'FaCloudUploadAlt',
                description: 'Upload documents, screenshots, designs, reports, references, or sample files if available.'
            },
            {
                title: 'Review & Submit',
                icon: 'FaCheckCircle',
                description: 'Confirm your request before sending it to AngiSoft for review.'
            }
        ],

        discoveryQuestions: [
            {
                question: 'What problem are you trying to solve?',
                placeholder:
                    'Example: I want to manage sales, customers, inventory, payments, reports, or bookings digitally.'
            },
            {
                question: 'Who will use this solution?',
                placeholder:
                    'Example: customers, staff, students, admins, artists, DJs, tenants, managers, or business owners.'
            },
            {
                question: 'Which features do you need?',
                placeholder:
                    'Example: login, dashboard, reports, payments, notifications, file upload, admin panel, roles, analytics.'
            },
            {
                question: 'Do you need integrations?',
                placeholder:
                    'Example: M-Pesa, PayPal, Stripe, SMS, email, Google services, maps, AI tools, existing systems.'
            },
            {
                question: 'Do you already have designs, documents, or examples?',
                placeholder:
                    'You can describe them here or upload files in the next step.'
            }
        ],

        paymentStep: {
            title: 'Payment & Proposal',
            icon: 'FaCreditCard',
            description:
                'Payment is handled after your request is reviewed, the scope is understood, and a clear quotation or proposal is shared. Some projects may require a deposit before development begins.'
        },

        projectTypes: [
            {
                value: 'SOFTWARE_DEVELOPMENT',
                label: 'Custom Software Development',
                icon: '💻',
                description: 'Web applications, APIs, dashboards, portals, admin panels, and business systems.'
            },
            {
                value: 'MOBILE_APP',
                label: 'Mobile App Development',
                icon: '📱',
                description: 'Android, iOS, and cross-platform mobile apps using Flutter, Kotlin, or other modern tools.'
            },
            {
                value: 'SAAS_PRODUCT',
                label: 'SaaS / Product Development',
                icon: '🚀',
                description: 'Scalable platforms, MVPs, subscription systems, creator platforms, and long-term product builds.'
            },
            {
                value: 'BUSINESS_SYSTEM',
                label: 'Business System / ERP / POS',
                icon: '🏢',
                description: 'POS systems, inventory, CRM, HR, billing, reports, operations, and management platforms.'
            },
            {
                value: 'AI_AUTOMATION',
                label: 'AI & Automation',
                icon: '🤖',
                description: 'AI chatbots, workflow automation, document processing, reports, scripts, and smart systems.'
            },
            {
                value: 'DATA_ANALYTICS',
                label: 'Data Analytics & Dashboards',
                icon: '📊',
                description: 'Excel/Python analysis, Power BI, dashboards, reports, ETL pipelines, and business insights.'
            },
            {
                value: 'CLOUD_INFRASTRUCTURE',
                label: 'Cloud, DevOps & Infrastructure',
                icon: '☁️',
                description: 'Cloud deployment, Docker, Linux servers, CI/CD, hosting, backups, monitoring, and scaling.'
            },
            {
                value: 'NETWORKING_ISP',
                label: 'Networking / ISP Systems',
                icon: '🌐',
                description: 'MikroTik, ISP billing, customer portals, network monitoring, routers, servers, and connectivity systems.'
            },
            {
                value: 'CYBERSECURITY',
                label: 'Cybersecurity & Digital Safety',
                icon: '🛡️',
                description: 'Security reviews, vulnerability checks, access control, data protection, and awareness training.'
            },
            {
                value: 'WEBSITE_PORTAL',
                label: 'Website / Web Portal',
                icon: '🌍',
                description: 'Company websites, landing pages, portfolios, client portals, blogs, and content platforms.'
            },
            {
                value: 'CREATOR_MUSIC_PLATFORM',
                label: 'Creator / Music / Entertainment Platform',
                icon: '🎧',
                description: 'Artist platforms, DJ mix distribution, AngiTunes-style systems, content upload, promotion, and monetization.'
            },
            {
                value: 'DIGITAL_SUPPORT',
                label: 'Digital Support Services',
                icon: '📝',
                description: 'Documents, reports, presentations, CVs, applications, Google Forms, software setup, and technical support.'
            },
            {
                value: 'TRAINING_EDUCATION',
                label: 'Training / Education Support',
                icon: '🎓',
                description: 'Programming guidance, beginner training, digital skills, project help, and technical mentorship.'
            },
            {
                value: 'OTHER',
                label: 'Other Project or Idea',
                icon: '✨',
                description: 'Use this if your request does not fit the categories above.'
            }
        ],

        expectations: {
            title: 'What Happens After Submission?',
            items: [
                'We review your request and understand your goals.',
                'We may contact you for clarification where needed.',
                'We identify the right solution type and engagement model.',
                'We estimate scope, timeline, and technical requirements.',
                'We prepare a quotation or proposal before payment begins.',
                'Once agreed, the project moves into planning and delivery.'
            ]
        },

        note:
            'Submitting a booking does not mean payment starts immediately. Pricing is confirmed after AngiSoft reviews your requirements and prepares a clear scope or proposal.'
    });

    console.log('  ✅ Booking copy settings');

    // ==================== SERVICES ====================
    const services = [
        {
            category: {
                name: 'Software Development',
                slug: 'software-development',
                description: 'Custom web and mobile applications built with modern technologies — from MVPs to enterprise platforms.',
                icon: 'FaLaptopCode',
                order: 1,
                published: true
            },
            service: {
                title: 'Software Development',
                slug: 'software-development',
                description: 'Custom web and mobile applications built with modern technologies — from MVPs to enterprise platforms.',
                features: [
                    'Web Application Development',
                    'Mobile App Development (Flutter/Kotlin)',
                    'API & Microservices',
                    'SaaS Product Development',
                    'Legacy System Modernization',
                    'UI/UX Design & Prototyping'
                ],
                images: ['/uploads/public/images/services/software-development.jpg'],
                published: true,
                featured: true
            }
        },

        {
            category: {
                name: 'IT Consulting',
                slug: 'it-consulting',
                description: 'Strategic technology consulting to help businesses choose the right stack, scale infrastructure, and optimize operations.',
                icon: 'FaCloud',
                order: 2,
                published: true
            },
            service: {
                title: 'IT Consulting',
                slug: 'it-consulting',
                description: 'Strategic technology consulting to help businesses choose the right stack, scale infrastructure, and optimize operations.',
                features: [
                    'Technology Strategy & Roadmap',
                    'Cloud Migration Planning',
                    'System Architecture Review',
                    'Digital Transformation',
                    'IT Infrastructure Audit',
                    'Vendor Selection & Evaluation'
                ],
                images: ['/uploads/public/images/services/it-consulting.jpg'],
                published: true,
                featured: true
            }
        },

        {
            category: {
                name: 'AI & Automation',
                slug: 'ai-automation',
                description: 'Integrate artificial intelligence and automation into your business processes to work smarter, not harder.',
                icon: 'FaBrain',
                order: 3,
                published: true
            },
            service: {
                title: 'AI & Automation',
                slug: 'ai-automation',
                description: 'Integrate artificial intelligence and automation into your business processes to work smarter, not harder.',
                features: [
                    'AI Chatbot Development',
                    'Workflow Automation',
                    'Predictive Analytics',
                    'Document Processing AI',
                    'Bash & Shell Scripting',
                    'Report Generation Systems'
                ],
                images: ['/uploads/public/images/services/ai-automation.jpg'],
                published: true,
                featured: true
            }
        },

        {
            category: {
                name: 'Cybersecurity',
                slug: 'cybersecurity',
                description: 'Protect your digital assets with comprehensive security services — from code reviews to penetration testing.',
                icon: 'FaShieldAlt',
                order: 4,
                published: true
            },
            service: {
                title: 'Cybersecurity',
                slug: 'cybersecurity',
                description: 'Protect your digital assets with comprehensive security services — from code reviews to penetration testing.',
                features: [
                    'Security Code Reviews',
                    'Vulnerability Assessments',
                    'Compliance Auditing',
                    'Incident Response Planning',
                    'Data Encryption & Protection',
                    'Security Awareness Training'
                ],
                images: ['/uploads/public/images/services/cybersecurity.jpg'],
                published: true,
                featured: true
            }
        },

        {
            category: {
                name: 'Data Analytics',
                slug: 'data-analytics',
                description: 'Transform raw data into actionable insights with custom dashboards, reports, and data pipelines.',
                icon: 'FaChartLine',
                order: 5,
                published: true
            },
            service: {
                title: 'Data Analytics',
                slug: 'data-analytics',
                description: 'Transform raw data into actionable insights with custom dashboards, reports, and data pipelines.',
                features: [
                    'Custom BI Dashboards',
                    'ETL Pipeline Development',
                    'Excel & Power BI Reporting',
                    'Real-Time Data Processing',
                    'Data Warehouse Design',
                    'Data Quality & Governance'
                ],
                images: ['/uploads/public/images/services/data-analytics.jpg'],
                published: true,
                featured: true
            }
        },

        {
            category: {
                name: 'Infrastructure',
                slug: 'infrastructure',
                description: 'Design, deploy, and manage cloud infrastructure and networking solutions that scale with your business.',
                icon: 'FaNetworkWired',
                order: 6,
                published: true
            },
            service: {
                title: 'Infrastructure',
                slug: 'infrastructure',
                description: 'Design, deploy, and manage cloud infrastructure and networking solutions that scale with your business.',
                features: [
                    'Cloud Deployment (AWS/Azure/DO)',
                    'Docker & Kubernetes Setup',
                    'CI/CD Pipeline Configuration',
                    'Network Design & Management',
                    'ISP Billing & Management',
                    'Server Administration'
                ],
                images: ['/uploads/public/images/services/infrastructure.jpg'],
                published: true,
                featured: true
            }
        }
    ];


    for (const item of services) {
        const category = await prisma.serviceCategory.upsert({
            where: { slug: item.category.slug },
            update: {
                name: item.category.name,
                description: item.category.description,
                icon: item.category.icon,
                order: item.category.order,
                published: item.category.published
            },
            create: {
                name: item.category.name,
                slug: item.category.slug,
                description: item.category.description,
                icon: item.category.icon,
                order: item.category.order,
                published: item.category.published
            }
        });

        await prisma.service.upsert({
            where: { slug: item.service.slug },
            update: {
                title: item.service.title,
                description: item.service.description,
                features: item.service.features,
                images: item.service.images,
                published: item.service.published,
                featured: item.service.featured,
                category: category.name,
                categoryId: category.id,
                authorId: admin?.id
            },
            create: {
                title: item.service.title,
                slug: item.service.slug,
                description: item.service.description,
                features: item.service.features,
                images: item.service.images,
                published: item.service.published,
                featured: item.service.featured,
                category: category.name,
                categoryId: category.id,
                authorId: admin?.id
            }
        });
    }

    console.log(`  ✅ ${services.length} service categories and services seeded`);
    // ==================== PROJECTS ====================
    //we will update this to appear in employee portals - when clients book for services, they will saved as project for tracking and employee assignment. For now, we will just seed some sample projects for testing.
    // ==================== BLOG POSTS ====================
    console.log('\n📰 Seeding blog posts...');

    if (admin) {
        const posts = [
            {
                title: 'How I Started Programming With Almost Nothing — A Real Story for Every Beginner Developer',
                slug: 'how-i-started-programming-with-almost-nothing',
                excerpt: 'Programming does not always begin with expensive laptops, university degrees, or big offices. Sometimes it begins with curiosity, broken systems, cyber cafés, and the desire to solve problems.',
                coverImage: '/uploads/public/images/cms/blogPost-c53f5518-1ca3-4fb4-88c3-5f8eb2f9e529-coverImage-534d9b2185.jpg',
                category: 'Programming',
                tags: ['Programming', 'Developers', 'Career Growth', 'Software Engineering', 'Africa'],
                featured: true,
                published: true,
                publishedAt: new Date('2026-01-25'),

                content: `
# How I Started Programming With Almost Nothing

Programming looks glamorous from outside.

People see:
- beautiful offices
- expensive laptops
- senior engineers
- AI tools
- huge salaries
- modern startups
- successful applications

But many real developers started from almost nothing.

Some started from:
- old laptops
- broken computers
- cyber cafés
- borrowed internet
- YouTube tutorials
- curiosity
- frustration
- survival

This is the reality for many African developers.

And honestly, there is nothing wrong with that beginning.

---

# Programming Is Not Only About Code

Most beginners think programming is only about writing code.

But real software engineering is about:
- solving problems
- thinking critically
- understanding people
- building systems
- fixing errors
- learning continuously

Code is just the tool.

The real job is solving problems.

---

# My First Interaction With Technology

Many developers first interact with computers through:
- games
- cyber cafés
- school computer labs
- phone repair shops
- operating system installations
- internet browsing

At first, technology feels magical.

Then curiosity starts growing:
- “How was this app made?”
- “How does this website work?”
- “How does login work?”
- “How do games run?”
- “How does M-Pesa work?”
- “How do apps talk to servers?”

That curiosity becomes the foundation of programming.

---

# You Do Not Need Expensive Equipment to Start

One of the biggest lies beginners believe is:

“I need expensive equipment first.”

No.

You can start with:
- a simple laptop
- a second-hand computer
- a phone
- a school computer
- cloud IDEs
- internet cafés

The internet already contains:
- tutorials
- documentation
- free courses
- communities
- GitHub projects
- open-source software

The biggest requirement is consistency.

---

# Start With Simple Projects

Many beginners fail because they try building:
- AI systems
- huge social media apps
- billion-dollar startups
- advanced SaaS platforms

immediately.

That creates frustration.

Start small.

Examples:
- calculator
- to-do app
- student management system
- portfolio website
- BMI calculator
- expense tracker
- inventory system
- simple POS
- weather app

Small projects build confidence.

---

# The Importance of Debugging

Nobody talks enough about debugging.

Beginners think professional developers write perfect code.

That is false.

Real developers spend huge amounts of time:
- fixing bugs
- reading logs
- restarting services
- debugging APIs
- searching Stack Overflow
- checking documentation
- tracing errors

Debugging is one of the most important programming skills.

Learning how to stay calm when things break is part of becoming a developer.

---

# Why Many Beginners Quit

Many people quit programming because:
- tutorials become confusing
- errors feel overwhelming
- progress feels slow
- they compare themselves with seniors
- they think they are not smart enough

But every developer experiences this.

Even senior engineers still:
- forget syntax
- search Google
- read documentation
- break production systems
- face deployment issues

Programming is continuous learning.

---

# Programming Changed the World

Think about the systems you use daily:
- M-Pesa
- WhatsApp
- YouTube
- TikTok
- Uber
- Instagram
- Google Maps

All these systems were built by developers.

Programming shapes:
- business
- education
- healthcare
- transport
- entertainment
- communication
- finance

Developers are helping shape the future.

---

# The African Opportunity

Africa is one of the biggest opportunities for developers.

Why?

Because many systems still need improvement:
- school systems
- hospital systems
- transport systems
- agriculture systems
- payment systems
- creator platforms
- government systems

This means African developers have huge opportunities to build useful technology.

---

# Learn By Solving Real Problems

One of the fastest ways to grow is solving practical problems.

Instead of endlessly watching tutorials:
- help a local business
- automate a small task
- build a dashboard
- fix a broken system
- create a reporting tool
- help someone digitize records

Real-world experience grows your skills faster.

---

# Best Technologies for Beginners

## Frontend Development
Frontend is what users see.

Learn:
- HTML
- CSS
- JavaScript
- React

## Backend Development
Backend handles logic and databases.

Learn:
- Node.js
- Python
- Express.js
- PostgreSQL

## Mobile Development
Mobile development is growing rapidly.

Learn:
- Flutter
- Kotlin
- React Native

## Data Analysis
Data is everywhere.

Learn:
- Excel
- Python
- Pandas
- Power BI

---

# You Do Not Need to Know Everything

Many beginners panic because technology is huge.

You do not need to master everything immediately.

Focus on:
- fundamentals
- consistency
- projects
- problem solving

Growth happens gradually.

---

# Build a Portfolio Early

Do not wait until you become “perfect.”

Start building:
- GitHub repositories
- portfolio websites
- demo systems
- practice apps

Employers and clients trust visible work more than promises.

---

# Learn Communication Too

Many developers ignore communication.

But software engineering also requires:
- teamwork
- explaining ideas
- understanding users
- writing documentation
- discussing requirements

Good communication makes developers more valuable.

---

# Programming Can Change Your Life

Programming creates opportunities:
- freelancing
- remote work
- startups
- SaaS products
- automation businesses
- consulting
- teaching
- digital entrepreneurship

Many developers started from difficult backgrounds but built successful careers through technology.

---

# Final Advice for Beginners

If you are starting programming today:

Do not fear being a beginner.

Do not fear errors.

Do not fear asking questions.

Do not wait for perfect conditions.

Start small.
Stay consistent.
Keep learning.
Keep building.

One day, the small projects you are creating today may become platforms that help thousands or millions of people.

That is how many real technology journeys begin.
`
            },
            {
                title: 'The Complete Beginner Roadmap to Becoming a Mobile App Developer in 2026',
                slug: 'complete-beginner-roadmap-mobile-app-development-2026',
                excerpt: 'Mobile app development is one of the most valuable digital skills today. This guide explains exactly how beginners can start building Android and iOS apps step by step.',
                coverImage: '/uploads/public/images/cms/blogPost-8b536f43-7d83-47cc-8157-a6c2a2b8ea9b-coverImage-d38cea0e91.jpg',
                category: 'Mobile Development',
                tags: [
                    'Flutter',
                    'Android',
                    'Mobile Development',
                    'Programming',
                    'Software Engineering',
                    'Technology'
                ],
                featured: true,
                published: true,
                publishedAt: new Date('2026-01-28'),

                content: `
# The Complete Beginner Roadmap to Becoming a Mobile App Developer in 2026

Look around you.

Almost every business today depends on mobile applications.

People use apps for:
- banking
- transport
- shopping
- entertainment
- communication
- education
- healthcare
- delivery services
- creator platforms

Mobile applications are now part of everyday life.

This means mobile development has become one of the most valuable technology skills in the world.

And the best part?

You can start learning today.

---

# What Is Mobile App Development?

Mobile app development means creating applications for:
- Android phones
- iPhones
- tablets
- wearable devices

Examples of mobile apps include:
- WhatsApp
- TikTok
- Instagram
- Uber
- M-Pesa apps
- banking apps
- shopping apps

Behind every app are developers designing and building systems.

---

# Why Mobile Development Is Growing Fast in Africa

Africa is becoming increasingly mobile-first.

Many people access the internet mainly through phones.

This creates huge opportunities for developers because businesses need:
- customer apps
- delivery apps
- POS systems
- booking apps
- e-learning platforms
- transport systems
- creator platforms
- fintech systems

The demand for mobile developers keeps growing.

---

# Do You Need a Computer Science Degree?

No.

Many successful developers are self-taught.

What matters most is:
- consistency
- practical skills
- projects
- problem solving
- willingness to learn

The internet already provides:
- tutorials
- documentation
- communities
- open-source projects
- free courses

---

# Which Mobile Technology Should Beginners Learn?

This is one of the biggest questions beginners ask.

## Flutter

Flutter is one of the best technologies for beginners today.

Why?

Because Flutter allows you to build:
- Android apps
- iPhone apps
- web apps
- desktop apps

using one codebase.

Advantages:
- fast development
- beautiful UI
- huge community
- cross-platform support

---

## Kotlin

Kotlin is excellent for native Android development.

Advantages:
- official Android language
- powerful performance
- modern syntax
- strong job opportunities

---

## React Native

React Native is also popular.

Especially if you already know JavaScript and React.

---

# What You Should Learn First

Many beginners become overwhelmed because mobile development seems huge.

The secret is learning step by step.

---

# STEP 1 — Learn Programming Basics

Before building apps, understand:
- variables
- functions
- loops
- conditions
- arrays
- objects

Without programming fundamentals, mobile development becomes difficult.

---

# STEP 2 — Learn UI Design Basics

A mobile app is not only logic.

Users interact with interfaces.

Learn:
- layouts
- buttons
- forms
- navigation
- colors
- spacing
- responsiveness

Good UI improves user experience.

---

# STEP 3 — Learn State Management

This is where many beginners struggle.

State management helps apps:
- update data
- refresh screens
- manage user actions

In Flutter you may learn:
- Provider
- Riverpod
- Bloc

---

# STEP 4 — Learn APIs

Modern apps communicate with servers.

Examples:
- login systems
- payments
- maps
- messaging
- weather systems

APIs allow apps to exchange data.

This is one of the most important skills.

---

# STEP 5 — Learn Databases

Apps often store:
- users
- messages
- products
- transactions
- reports

Common databases:
- PostgreSQL
- MongoDB
- Firebase
- SQLite

---

# STEP 6 — Learn Authentication

Authentication means:
- login
- signup
- passwords
- sessions
- security

Users expect secure systems.

---

# STEP 7 — Learn Deployment

Many beginners can code but cannot publish apps.

Learn:
- Play Store publishing
- app signing
- app builds
- release management

Deployment is part of real development.

---

# Beginner Projects You Can Build

Do not wait until you become “advanced.”

Build projects early.

Examples:
- calculator app
- school app
- inventory system
- portfolio app
- church app
- expense tracker
- music app
- transport app
- booking system

Projects build confidence.

---

# The Reality of Mobile Development

Many people quit because:
- builds fail
- dependencies break
- emulators become slow
- layouts misbehave
- APIs fail
- devices behave differently

This is normal.

Even experienced developers face these problems daily.

---

# Important Skills Beyond Coding

Great developers also learn:
- communication
- teamwork
- debugging
- system design
- Git and GitHub
- problem solving

Technology is not only about syntax.

---

# Mobile Development Can Create Opportunities

Mobile development can lead to:
- freelancing
- remote jobs
- startups
- SaaS products
- consulting
- creator platforms
- digital businesses

Many modern African startups depend heavily on mobile apps.

---

# Final Advice

If you want to become a mobile developer:

Start now.

Do not wait for:
- perfect laptops
- expensive courses
- perfect internet
- perfect confidence

The best way to learn is:
- build
- fail
- debug
- improve
- repeat

That is how real developers grow.
`
            },
            {
                title: 'Why Every Beginner Developer Must Learn Git and GitHub Early',
                slug: 'why-beginner-developers-must-learn-git-and-github',
                excerpt: 'Many beginners ignore Git and GitHub until late, yet they are some of the most important tools in software engineering.',
                coverImage: '/uploads/public/images/cms/blogPost-b112e047-b390-4286-8c5d-6d5683d38786-coverImage-d6a88429e3.jpg',
                category: 'Software Engineering',
                tags: [
                    'Git',
                    'GitHub',
                    'Programming',
                    'Developers',
                    'Software Engineering'
                ],
                featured: true,
                published: true,
                publishedAt: new Date('2026-01-30'),

                content: `
# Why Every Beginner Developer Must Learn Git and GitHub Early

Many beginner developers focus only on coding.

They learn:
- HTML
- CSS
- JavaScript
- Flutter
- Python

But they ignore one of the most important tools in software engineering:

Git.

And later:
GitHub.

This becomes a huge problem.

---

# What Is Git?

Git is a version control system.

It helps developers:
- track code changes
- collaborate with teams
- restore previous versions
- manage projects safely

Think of Git like a “save history system” for code.

Without Git, developers easily lose work.

---

# What Is GitHub?

GitHub is a platform where developers:
- store projects
- collaborate
- share code
- manage repositories
- contribute to open source

GitHub is like a social network for developers.

Many companies check GitHub portfolios before hiring developers.

---

# Why Git Matters So Much

Imagine this:

You are building a system.

Then suddenly:
- you delete important code
- the app stops working
- new changes break everything

Without Git:
you panic.

With Git:
you can restore previous versions easily.

---

# Git Helps Teams Work Together

Modern software is rarely built alone.

Teams may include:
- frontend developers
- backend developers
- mobile developers
- designers
- testers
- DevOps engineers

Git allows all these people to collaborate safely.

---

# Basic Git Concepts Every Beginner Should Learn

## Repository

A repository stores your project.

---

## Commit

A commit saves changes with a message.

Example:
\`git commit -m "Added login feature"\`

---

## Push

Push uploads changes to GitHub.

---

## Pull

Pull downloads updates from GitHub.

---

## Branches

Branches allow developers to work on features separately without breaking the main project.

---

# Why GitHub Portfolios Matter

Many beginners ask:

“How do I get clients or jobs?”

One answer is:
build a GitHub portfolio.

Your GitHub shows:
- your projects
- your consistency
- your growth
- your coding style

A strong GitHub profile builds trust.

---

# Common Beginner Mistakes

## 1. Learning Git Too Late

Many developers postpone Git.

That becomes painful later.

---

## 2. Fear of the Terminal

Git mostly uses commands.

Many beginners fear terminals.

But terminals are powerful tools.

---

## 3. Never Creating Projects

Some people only watch tutorials.

Without projects:
GitHub remains empty.

---

# Beginner Git Commands

## Initialize Git
\`\`\`bash
git init
\`\`\`

## Check Status
\`\`\`bash
git status
\`\`\`

## Add Files
\`\`\`bash
git add .
\`\`\`

## Commit Changes
\`\`\`bash
git commit -m "Initial commit"
\`\`\`

## Push to GitHub
\`\`\`bash
git push
\`\`\`

---

# Why Open Source Matters

GitHub also allows developers to:
- contribute to open-source projects
- learn from real systems
- collaborate globally

Open source is one of the best ways to grow.

---

# Git Is Not Optional

Modern software engineering without Git is almost impossible.

Companies expect developers to understand:
- repositories
- branches
- pull requests
- merges
- collaboration workflows

---

# Final Advice

If you are learning programming:

Learn Git early.

Learn GitHub early.

Build projects consistently.

Do not fear mistakes.

Even senior developers still:
- break branches
- face merge conflicts
- forget commands
- debug Git issues

That is normal.

The important thing is continuing to learn and build.
`
            },
        ];

        for (const post of posts) {
            const { category, ...postData } = post;
            const blogCategory = await prisma.blogCategory.upsert({
                where: { slug: slugify(category) },
                update: { name: category },
                create: {
                    name: category,
                    slug: slugify(category),
                    description: `${category} articles and insights`
                }
            });

            await prisma.blogPost.upsert({
                where: { slug: post.slug },
                update: { ...postData, authorId: admin.id, categoryId: blogCategory.id },
                create: { ...postData, authorId: admin.id, categoryId: blogCategory.id }
            });
        }
        console.log(`  ✅ ${posts.length} blog posts seeded`);
    }

    // ==================== TESTIMONIALS ====================
    console.log('\n⭐ Seeding testimonials...');

    const testimonials = [
        {
            name: 'Prof Angera',
            company: 'AngiSoft Technologies',
            role: 'Founder / Product Lead',
            text: 'AngiSoft started by solving practical everyday technical problems, and that foundation still guides how we build: identify real needs, create useful systems, and empower people through technology.',
            rating: 5,
            confirmed: true,
            featured: true,
            projectType: 'Company Story'
        },

        {
            name: 'Sharif Agoi',
            company: 'Community Client',
            role: 'Business Support Client',
            text: 'AngiSoft helped simplify technical work that many people struggle with daily. From digital support to system guidance, the experience felt practical, friendly, and professional.',
            rating: 5,
            confirmed: true,
            featured: true,
            projectType: 'Digital Support'
        },

        {
            name: 'DJ Cosmic Star',
            company: 'Entertainment Industry',
            role: 'DJ & Creative',
            text: 'What stands out about AngiSoft is the vision for creators and DJs. The AngiTunes direction shows real understanding of challenges upcoming artists and entertainers face in the digital world.',
            rating: 5,
            confirmed: true,
            featured: true,
            projectType: 'Creator Ecosystem'
        },

        {
            name: 'Lex Mureithi',
            company: 'Technology Community',
            role: 'Tech Enthusiast',
            text: 'AngiSoft has grown from simple technical support into something much bigger. The focus on innovation, systems, and empowering young people through technology is inspiring.',
            rating: 5,
            confirmed: true,
            featured: false,
            projectType: 'Technology & Innovation'
        },

        {
            name: 'Emmanuel Rotich',
            company: 'Business Client',
            role: 'Operations Support',
            text: 'The best thing about AngiSoft is the practical approach to solving problems. Whether it is systems, reports, networking, or automation, the solutions are built around real needs.',
            rating: 5,
            confirmed: true,
            featured: false,
            projectType: 'Business Systems'
        },

        {
            name: 'Sharon Kundu',
            company: 'Education & Digital Services',
            role: 'Community Support Client',
            text: 'AngiSoft combines technology with empowerment. Beyond software, there is a strong focus on helping people learn, grow, and access digital opportunities.',
            rating: 5,
            confirmed: true,
            featured: true,
            projectType: 'Education & Empowerment'
        }
    ];

    for (const testimonial of testimonials) {
        const existing = await prisma.testimonial.findFirst({ where: { name: testimonial.name, company: testimonial.company } });
        if (!existing) {
            await prisma.testimonial.create({ data: testimonial });
        }
    }
    console.log(`  ✅ ${testimonials.length} authentic testimonial/story entries seeded`);

    // ==================== STAFF MEMBERS ====================
    console.log('\n👥 Seeding staff members...');

    const staffMembers = [
        {
            firstName: 'Sharif',
            lastName: 'Agoi',
            email: 'sharif.agoi@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            username: 'sharif-agoi',
            bio: 'Full-stack developer specializing in React, Node.js, and PostgreSQL. 6+ years building web and mobile applications for East African businesses.',
            publicTitle: 'Full-Stack Developer',
            publicSummary: 'Builds reliable web and mobile platforms for East African businesses.',
            skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
            specialties: ['Business systems', 'API design', 'Dashboards'],
            profilePublished: true,
            profileOrder: 1,
            avatarUrl: '/uploads/public/images/team/sharif-agoi.jpg',
            phone: '+254769320092',
            publicEmail: 'sharif.agoi@angisoft.co.ke'
        },
        {
            firstName: 'Prof Angera',
            lastName: 'Silas',
            email: 'sangera@angisoft.co.ke',
            role: 'ADMIN' as const,
            username: 'sangera',
            bio: 'Mobile developer with expertise in Flutter and Kotlin. Passionate about creating intuitive user experiences for Android and iOS platforms.',
            publicTitle: 'Mobile App Developer',
            publicSummary: 'Creates Flutter and Kotlin mobile apps with polished customer experiences.',
            skills: ['Flutter', 'Kotlin', 'Android', 'UI/UX'],
            specialties: ['Mobile apps', 'MVP builds', 'Cross-platform delivery'],
            profilePublished: true,
            profileOrder: 2,
            avatarUrl: '/uploads/public/images/team/sangera.jpg',
            phone: '+254797630228',
            publicEmail: 'sangera@angisoft.co.ke'
        },

        {
            firstName: 'Mike',
            lastName: 'Wanjala',
            email: 'mike.wanjala@angisoft.co.ke',
            role: 'MARKETING' as const,
            username: 'mike-wanjala',
            bio: 'Digital marketing specialist focused on tech companies. Manages brand development, content strategy, and client communications.',
            publicTitle: 'Digital Marketing Specialist',
            publicSummary: 'Connects AngiSoft services with customers through content and brand strategy.',
            skills: ['Content strategy', 'Branding', 'Client communication'],
            specialties: ['Campaigns', 'Product promotion', 'Customer onboarding'],
            profilePublished: true,
            profileOrder: 4,
            avatarUrl: '/uploads/public/images/team/mike-wanjala.jpg',
            phone: '+254769215571',
            publicEmail: 'mike.wanjala@angisoft.co.ke'
        }
    ];

    for (const member of staffMembers) {
        const existing = await prisma.employee.findUnique({ where: { email: member.email } });
        if (!existing) {
            const memberHash = await bcrypt.hash('Welcome123!', 10);
            await prisma.employee.create({
                data: {
                    ...member,
                    passwordHash: memberHash,
                    acceptedAt: new Date()
                }
            });
        }
    }
    console.log(`  ✅ ${staffMembers.length} staff members seeded`);

    // ==================== FAQs ====================
    console.log('\n❓ Seeding FAQs...');


    const faqs = [
        // ================= GENERAL =================
        {
            question: 'What is AngiSoft Technologies?',
            answer: 'AngiSoft Technologies is a Kenyan technology company and digital innovation brand that officially began in December 2024. We started by helping students, businesses, creators, and communities solve practical digital and technical problems, and today we are growing into a software engineering and product ecosystem focused on innovation, technology, and empowerment.',
            category: 'General',
            order: 1
        },

        {
            question: 'What does “Innovate • Build • Empower” mean?',
            answer: 'This is the philosophy that guides AngiSoft. Innovate means identifying real-world problems and opportunities. Build means creating useful digital solutions and systems. Empower means helping people grow through technology, education, employment, digital tools, and knowledge sharing.',
            category: 'General',
            order: 2
        },

        {
            question: 'What services does AngiSoft Technologies offer?',
            answer: 'AngiSoft offers software development, mobile app development, web platforms, business systems, POS systems, dashboards, automation tools, networking support, data analysis, report editing, presentation design, cyber services, branding, digital support services, and educational technology solutions.',
            category: 'General',
            order: 3
        },

        {
            question: 'Who does AngiSoft help?',
            answer: 'We help startups, SMEs, businesses, schools, institutions, artists, DJs, creators, students, developers, internet service providers, entrepreneurs, and communities looking for affordable and scalable technology solutions.',
            category: 'General',
            order: 4
        },

        {
            question: 'Where is AngiSoft Technologies located?',
            answer: 'AngiSoft Technologies is Kenya-rooted and operates from Nairobi, Kenya, while serving clients both locally and globally through digital platforms and remote collaboration.',
            category: 'General',
            order: 5
        },

        {
            question: 'How can I contact AngiSoft?',
            answer: 'You can contact us through phone, WhatsApp, email, or the website contact form. We also plan to provide live chat, booking systems, and digital support platforms for easier communication.',
            category: 'General',
            order: 6
        },

        // ================= HISTORY & STORY =================
        {
            question: 'How did AngiSoft start?',
            answer: 'AngiSoft started in December 2024 with Prof Angera as the only developer and operator. The company began by helping people with practical digital tasks such as debugging projects, creating systems, editing reports, designing presentations, setting up software, helping with online applications, and solving everyday technical challenges.',
            category: 'Our Story',
            order: 1
        },

        {
            question: 'Why did AngiSoft evolve into a technology company?',
            answer: 'Over time, it became clear that many local technical challenges could be solved more effectively using scalable software platforms, automation, cloud systems, AI tools, and digital ecosystems. That is why AngiSoft evolved from offering technical support services into building technology products and software platforms.',
            category: 'Our Story',
            order: 2
        },

        {
            question: 'Is AngiSoft just a software company?',
            answer: 'No. AngiSoft is growing into a broader technology ecosystem. Apart from software engineering, we also focus on education, empowerment, digital transformation, creator platforms, networking solutions, automation, business systems, and technology-driven community growth.',
            category: 'Our Story',
            order: 3
        },

        // ================= PRODUCTS =================
        {
            question: 'What is PetroFlow?',
            answer: 'PetroFlow is one of AngiSoft’s major products focused on fuel station and petroleum business management. It is intended to help stations manage fuel stock, shifts, sales, reporting, and operational workflows more efficiently.',
            category: 'Products',
            order: 1
        },

        {
            question: 'What is DukaFlow?',
            answer: 'DukaFlow is a retail and SME business management platform designed to help shops and businesses manage inventory, sales, expenses, customer records, and business operations digitally.',
            category: 'Products',
            order: 2
        },

        {
            question: 'What is AngiTunes?',
            answer: 'AngiTunes is a creator and music ecosystem being developed to help upcoming artists, DJs, and creators distribute, organize, promote, and monetize their digital content affordably.',
            category: 'Products',
            order: 3
        },

        {
            question: 'What is KejaLink?',
            answer: 'KejaLink is a housing and property-related platform intended to support rental listings, tenant management, communication, maintenance workflows, and property operations.',
            category: 'Products',
            order: 4
        },

        // ================= SOFTWARE & TECH =================
        {
            question: 'What technologies does AngiSoft use?',
            answer: 'AngiSoft uses modern technologies such as React, Flutter, Kotlin, Node.js, Python, TypeScript, PostgreSQL, Docker, Linux, cloud platforms, automation tools, and AI technologies depending on the project requirements.',
            category: 'Technology',
            order: 1
        },

        {
            question: 'Does AngiSoft build mobile apps?',
            answer: 'Yes. We build Android, iOS, and cross-platform mobile applications using technologies such as Flutter and Kotlin.',
            category: 'Technology',
            order: 2
        },

        {
            question: 'Does AngiSoft create websites and web systems?',
            answer: 'Yes. We create websites, dashboards, admin panels, SaaS systems, portals, APIs, and enterprise web applications for businesses and organizations.',
            category: 'Technology',
            order: 3
        },

        {
            question: 'Can AngiSoft help with networking and MikroTik systems?',
            answer: 'Yes. AngiSoft also works with networking solutions including MikroTik setup, internet infrastructure support, ISP-related systems, and digital connectivity solutions.',
            category: 'Technology',
            order: 4
        },

        // ================= EDUCATION & EMPOWERMENT =================
        {
            question: 'Does AngiSoft teach technology skills?',
            answer: 'Yes. One of AngiSoft’s goals is digital empowerment. We help beginners learn programming, software development, data analysis, networking, automation, and other technology skills through practical guidance, educational content, and future learning platforms.',
            category: 'Education & Empowerment',
            order: 1
        },

        {
            question: 'Will AngiSoft publish educational blogs and tutorials?',
            answer: 'Yes. AngiSoft plans to publish educational content about software engineering, AI, networking, MikroTik setup, Android development, cloud systems, business systems, DJ setup, digital productivity, entrepreneurship, and technology in Africa.',
            category: 'Education & Empowerment',
            order: 2
        },

        {
            question: 'How does AngiSoft empower people?',
            answer: 'AngiSoft empowers people by building useful technology, sharing knowledge, supporting creators, helping businesses digitize operations, creating opportunities for developers and designers, and making digital tools more accessible.',
            category: 'Education & Empowerment',
            order: 3
        },

        // ================= PROJECTS & BOOKINGS =================
        {
            question: 'How do I start a project with AngiSoft?',
            answer: 'You can start by contacting us through the website booking system, WhatsApp, email, or phone. Share your idea, challenge, or requirements, and AngiSoft will help you understand the best next steps.',
            category: 'Projects & Bookings',
            order: 1
        },

        {
            question: 'Can I request a custom system or idea?',
            answer: 'Yes. AngiSoft specializes in custom solutions. Whether you need a business system, mobile app, dashboard, automation tool, creator platform, or SaaS product, we can help design and build it.',
            category: 'Projects & Bookings',
            order: 2
        },

        {
            question: 'Do you support students and beginners?',
            answer: 'Yes. AngiSoft began by helping students and beginners with projects, debugging, reports, coding support, presentations, and digital guidance. Education and empowerment remain part of our identity.',
            category: 'Projects & Bookings',
            order: 3
        },

        // ================= FUTURE =================
        {
            question: 'What is the future vision of AngiSoft?',
            answer: 'AngiSoft aims to become a scalable African technology ecosystem focused on SaaS platforms, AI-powered systems, automation tools, creator platforms, enterprise software, educational technology, networking systems, and digital empowerment solutions.',
            category: 'Future Vision',
            order: 1
        },

        {
            question: 'Will AngiSoft employ developers and creators in future?',
            answer: 'Yes. One of AngiSoft’s long-term goals is to create opportunities for developers, designers, marketers, testers, writers, creators, and other digital professionals through technology projects and innovation platforms.',
            category: 'Future Vision',
            order: 2
        }
    ];


    for (const faq of faqs) {
        const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
        if (!existing) {
            await prisma.faq.create({ data: { ...faq, published: true } });
        }
    }
    console.log(`  ✅ ${faqs.length} FAQs seeded`);

    // ==================== PRODUCTS ====================
    console.log('\n📦 Seeding products...');

    const products = [
        {
            name: 'PetroFlow',
            slug: 'petroflow',
            tagline: 'Fuel Station Operations Platform',
            description: 'PetroFlow is AngiSoft’s fuel station and petroleum operations platform direction: built to support stock tracking, shift reconciliation, sales records, staff workflows, and practical reporting for station operators.',
            category: 'Fuel & Energy',
            logoUrl: '/uploads/public/images/Logos/PetroFlow.png',
            features: ['Pump and shift records', 'Fuel stock tracking', 'Sales reconciliation', 'Staff workflow support', 'M-Pesa/payment readiness', 'Multi-station reporting direction', 'Daily operational summaries', 'Audit-friendly records'],
            pricing: { model: 'scoped', currency: 'KES', note: 'Pricing depends on station count, workflows, and integrations.' },
            status: 'DEVELOPMENT' as const,
            published: true,
            sortOrder: 1
        },
        {
            name: 'DukaFlow',
            slug: 'dukaflow',
            tagline: 'Retail and SME Management System',
            description: 'DukaFlow is AngiSoft’s retail/shop/business management product direction for sales, inventory, expenses, customers, and simple business reporting for local businesses.',
            category: 'Retail & Commerce',
            logoUrl: '/uploads/public/images/Logos/DukaFlow.png',
            features: ['POS sales records', 'Inventory tracking', 'Cash and M-Pesa workflow support', 'Supplier records', 'Expense tracking', 'Daily sales reports', 'Customer records', 'Simple dashboards'],
            pricing: { model: 'scoped', currency: 'KES', note: 'Starter and subscription pricing will depend on business size and modules.' },
            status: 'DEVELOPMENT' as const,
            published: true,
            sortOrder: 2
        },
        {
            name: 'KejaLink',
            slug: 'kejalink',
            tagline: 'Property and Rental Workflow Platform',
            description: 'KejaLink is AngiSoft’s property and housing platform direction for rental listings, tenant records, communication, maintenance requests, and property workflow management.',
            category: 'Property & Housing',
            logoUrl: '/uploads/public/images/Logos/KejaLink.png',
            features: ['Property records', 'Tenant workflow support', 'Maintenance requests', 'Vacancy listing direction', 'Lease document tracking', 'Payment record workflows', 'SMS/WhatsApp communication direction', 'Document storage'],
            pricing: { model: 'planned', currency: 'KES', note: 'Pricing will be shaped around landlords, agents, and tenant workflow needs.' },
            status: 'PLANNED' as const,
            published: true,
            sortOrder: 3
        },
        {
            name: 'AngiTunes',
            slug: 'angitunes',
            tagline: 'Creator and Music Distribution Ecosystem',
            description: 'AngiTunes is AngiSoft’s creator economy direction for helping upcoming artists, DJs, and creators distribute, organize, and monetize digital music and creator content affordably.',
            category: 'Entertainment & Music',
            logoUrl: '/uploads/public/images/Logos/AngiTunes.png',
            features: ['Creator catalog direction', 'Music upload workflows', 'DJ mix distribution direction', 'Creator profile support', 'Release organization', 'Audience engagement direction', 'Affordable monetization model', 'Rights and ownership awareness'],
            pricing: { model: 'planned', currency: 'KES', note: 'Pricing will be designed for upcoming artists, DJs, and creators.' },
            status: 'PLANNED' as const,
            published: true,
            sortOrder: 4
        }
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { slug: product.slug },
            update: product,
            create: product
        });
    }
    console.log(`  ✅ ${products.length} products seeded`);

    // ==================== COMPANY STATS ====================
    console.log('\n📊 Seeding company stats...');

    const stats = [
        {
            label: 'Founded',
            value: 2024,
            suffix: '',
            icon: 'FaSeedling',
            order: 1,
            description: 'AngiSoft officially began in December 2024 from practical grassroots technical work.'
        },

        {
            label: 'Core Services',
            value: 10,
            suffix: '+',
            icon: 'FaLayerGroup',
            order: 2,
            description: 'Software engineering, automation, networking, data analysis, digital support, branding, and more.'
        },

        {
            label: 'Products & Platforms',
            value: 4,
            suffix: '+',
            icon: 'FaRocket',
            order: 3,
            description: 'PetroFlow, DukaFlow, AngiTunes, and KejaLink represent our growing technology ecosystem.'
        },

        {
            label: 'Mission',
            value: 3,
            suffix: '',
            icon: 'FaHandsHelping',
            order: 4,
            description: 'Innovate • Build • Empower — the philosophy guiding everything we create.'
        }
    ];

    for (const stat of stats) {
        const existing = await prisma.companyStat.findFirst({ where: { label: stat.label } });
        if (!existing) {
            await prisma.companyStat.create({ data: stat });
        }
    }
    console.log(`  ✅ ${stats.length} company stats seeded`);

    // ==================== CAREERS CONTENT ====================
    console.log('\n💼 Seeding careers content...');

    const careersContent = {
        cultureValues: [
            { id: 'practical-innovation', number: '01', title: 'Practical Innovation', description: 'We value ideas that solve real problems. Team members are encouraged to experiment, learn and turn strong concepts into useful working solutions.' },
            { id: 'shared-responsibility', number: '02', title: 'Shared Responsibility', description: 'Good products are built through communication, ownership and dependable collaboration across engineering, product, design and operations.' },
            { id: 'continuous-growth', number: '03', title: 'Continuous Growth', description: 'We support learning through practical challenges, mentorship, research, documentation and exposure to new tools and technologies.' },
            { id: 'meaningful-impact', number: '04', title: 'Meaningful Impact', description: 'Our work is shaped around businesses, institutions and communities that need better digital systems and accessible technology.' }
        ],
        benefits: [
            { id: 'flexibility', title: 'Flexible Working', description: 'Role-dependent remote, hybrid and on-site working arrangements.' },
            { id: 'learning', title: 'Learning and Development', description: 'Opportunities to improve technical, product and professional skills.' },
            { id: 'compensation', title: 'Fair Compensation', description: 'Compensation based on role scope, experience, contribution and company capacity.' },
            { id: 'health', title: 'Health and Wellbeing', description: 'Health support and employee wellbeing provisions as company structures grow.' },
            { id: 'ownership', title: 'Project Ownership', description: 'Clear responsibility and space to contribute directly to products and client solutions.' },
            { id: 'innovation', title: 'Room to Experiment', description: 'Time and support to test better approaches, tools and implementation ideas.' }
        ]
    };
    await seedSetting('careers_content', careersContent);
    console.log('  ✅ careers_content setting seeded');

    // Real, currently open roles. The public API filters status: 'OPEN',
    // so only these are visible on /careers. Replace with CMS-managed rows
    // as hiring needs change.
    const jobs: Prisma.JobPostingCreateInput[] = [
        {
            title: 'Flutter Mobile Developer',
            slug: 'flutter-mobile-developer',
            status: 'OPEN',
            department: 'Engineering',
            location: 'Nairobi, Kenya',
            employmentType: 'Full-Time',
            workplaceType: 'Hybrid',
            experienceLevel: 'Mid',
            summary: 'Build and maintain AngiSoft mobile products such as DukaFlow and client apps using Flutter and Dart.',
            description: 'We are looking for a Flutter developer to design, build and ship cross-platform mobile applications. You will work closely with the backend team to integrate APIs, implement offline-friendly flows and improve app performance.',
            responsibilities: [
                'Build and maintain Flutter applications for Android and iOS',
                'Integrate REST and GraphQL APIs into mobile screens',
                'Implement responsive, accessible and performant UI',
                'Work with the founder on product direction and releases'
            ],
            requirements: [
                'Solid experience with Flutter and Dart',
                'Understanding of state management and REST integration',
                'Comfortable reading and debugging backend responses'
            ],
            preferredQualifications: [
                'Experience with local storage and offline-first apps',
                'Familiarity with CI/CD for mobile builds',
                'Exposure to Kotlin or native Android'
            ],
            technologies: ['Flutter', 'Dart', 'REST', 'Firebase'],
            salaryMin: 90000,
            salaryMax: 160000,
            salaryCurrency: 'KES',
            salaryVisibility: 'RANGE',
            openings: 1,
            featured: true,
            applicationDeadline: '2026-09-30T23:59:59.000Z',
            publishedAt: '2026-07-17T08:00:00.000Z',
            benefits: ['Flexible Working', 'Learning and Development', 'Project Ownership'],
            published: true
        },
        {
            title: 'Data Analyst',
            slug: 'data-analyst',
            status: 'OPEN',
            department: 'Data',
            location: 'Nairobi, Kenya / Remote',
            employmentType: 'Full-Time',
            workplaceType: 'Remote',
            experienceLevel: 'Mid',
            summary: 'Turn raw operational and business data into clear dashboards, reports and decision support.',
            description: 'As a Data Analyst you will clean, model and visualize data from AngiSoft products and client engagements. You will produce dashboards and reports that help the team and clients make practical decisions.',
            responsibilities: [
                'Clean and prepare datasets from multiple sources',
                'Build dashboards and recurring reports',
                'Support product and client teams with analysis',
                'Document data definitions and quality checks'
            ],
            requirements: [
                'Strong Excel and Python data skills',
                'Experience with dashboards or BI tools',
                'Clear written reporting'
            ],
            preferredQualifications: [
                'SQL and database querying',
                'Experience with survey or operational data',
                'Python data libraries (pandas, matplotlib)'
            ],
            technologies: ['Python', 'Excel', 'SQL', 'Power BI'],
            salaryMin: 80000,
            salaryMax: 140000,
            salaryCurrency: 'KES',
            salaryVisibility: 'RANGE',
            openings: 1,
            featured: false,
            applicationDeadline: '2026-10-15T23:59:59.000Z',
            publishedAt: '2026-07-17T08:00:00.000Z',
            benefits: ['Flexible Working', 'Learning and Development', 'Fair Compensation'],
            published: true
        },
        {
            title: 'Cyber & Documents Associate',
            slug: 'cyber-documents-associate',
            status: 'OPEN',
            department: 'Cyber Services',
            location: 'Nairobi, Kenya',
            employmentType: 'Part-Time',
            workplaceType: 'On-Site',
            experienceLevel: 'Entry',
            summary: 'Support document preparation, report editing and digital services for clients and institutions.',
            description: 'This role supports AngiSoft cyber and documentation services: report writing, attachment preparation, thesis and poster formatting, presentation design and KRA/SHA/good conduct application support.',
            responsibilities: [
                'Prepare and format client documents and reports',
                'Design posters, presentations and academic materials',
                'Support KRA/SHA and good conduct application assistance',
                'Maintain quality and confidentiality standards'
            ],
            requirements: [
                'Strong written and formatting skills',
                'Attention to detail and confidentiality',
                'Comfortable with office and design tools'
            ],
            preferredQualifications: [
                'Experience with academic or institutional documents',
                'Basic design tool familiarity'
            ],
            technologies: ['MS Office', 'Canva', 'PDF Tools'],
            salaryMin: 40000,
            salaryMax: 70000,
            salaryCurrency: 'KES',
            salaryVisibility: 'RANGE',
            openings: 2,
            featured: false,
            applicationDeadline: '2026-11-01T23:59:59.000Z',
            publishedAt: '2026-07-17T08:00:00.000Z',
            benefits: ['Flexible Working', 'Learning and Development'],
            published: true
        },
        {
            title: 'Backend Engineer',
            slug: 'backend-engineer',
            status: 'OPEN',
            department: 'Engineering',
            location: 'Nairobi, Kenya / Remote',
            employmentType: 'Full-Time',
            workplaceType: 'Hybrid',
            experienceLevel: 'Senior',
            summary: 'Design and build the APIs, services and data layers behind AngiSoft products.',
            description: 'We need a backend engineer to design APIs, model databases and integrate third-party services for AngiSoft products and client systems. You will help set engineering standards and mentor other developers.',
            responsibilities: [
                'Design and implement REST and GraphQL APIs',
                'Model PostgreSQL schemas and optimize queries',
                'Integrate payment, email and storage providers',
                'Review code and support deployment workflows'
            ],
            requirements: [
                'Strong Node.js / TypeScript backend experience',
                'Solid PostgreSQL and ORM knowledge',
                'Experience with authentication and API security'
            ],
            preferredQualifications: [
                'DevOps and container experience',
                'Experience with Prisma and Express',
                'Background in product engineering'
            ],
            technologies: ['Node.js', 'TypeScript', 'PostgreSQL', 'Prisma'],
            salaryMin: 150000,
            salaryMax: 250000,
            salaryCurrency: 'KES',
            salaryVisibility: 'RANGE',
            openings: 1,
            featured: true,
            applicationDeadline: '2026-09-15T23:59:59.000Z',
            publishedAt: '2026-07-17T08:00:00.000Z',
            benefits: ['Flexible Working', 'Learning and Development', 'Project Ownership', 'Fair Compensation'],
            published: true
        }
    ];

    for (const job of jobs) {
        await prisma.jobPosting.upsert({
            where: { slug: job.slug },
            update: job,
            create: job
        });
    }
    console.log(`  ✅ ${jobs.length} job postings seeded`);

    // ==================== HOME PAGE SECTIONS ====================
    console.log('\n🏠 Seeding home page sections...');


    const homeSections = [
        {
            sectionId: 'hero',
            title: 'Hero Section',
            visible: true,
            order: 1,
            component: 'HeroSlider',
            description: 'Main landing hero introducing AngiSoft Technologies, our philosophy, products, and mission.'
        },

        {
            sectionId: 'key-facts',
            title: 'Key Facts About AngiSoft',
            visible: true,
            order: 2,
            component: 'KeyFacts',
            description: 'Highlights important company facts, growth journey, products, services, and vision.'
        },

        {
            sectionId: 'services',
            title: 'Explore Our Offering',
            visible: true,
            order: 3,
            component: 'ServicesSection',
            description: 'Displays AngiSoft services including software engineering, automation, networking, data systems, cyber services, and digital support.'
        },

        {
            sectionId: 'industry-expertise',
            title: 'Industry Expertise',
            visible: true,
            order: 4,
            component: 'IndustryExpertise',
            description: 'Shows industries and sectors AngiSoft supports using technology solutions.'
        },

        {
            sectionId: 'solutions',
            title: 'Solutions We Deliver',
            visible: true,
            order: 5,
            component: 'SolutionsWeDeliver',
            description: 'Showcases business systems, SaaS platforms, enterprise systems, mobile apps, automation tools, and digital ecosystems.'
        },

        {
            sectionId: 'tech-trends',
            title: 'Technology Trends & Innovation',
            visible: true,
            order: 6,
            component: 'TechTrendsSection',
            description: 'Highlights emerging technologies, AI, cloud systems, automation, creator economy systems, and digital transformation trends.'
        },

        {
            sectionId: 'success-stories',
            title: 'Products & Success Stories',
            visible: true,
            order: 7,
            component: 'SuccessStories',
            description: 'Presents AngiSoft products such as PetroFlow, DukaFlow, KejaLink, and AngiTunes together with company growth milestones and practical achievements.'
        },

        {
            sectionId: 'brand-cta',
            title: 'Brand Call To Action',
            visible: true,
            order: 8,
            component: 'BrandCTA',
            description: 'Encourages visitors to start projects, collaborate, or engage with AngiSoft Technologies.'
        },

        {
            sectionId: 'blog',
            title: 'Insights & Educational Content',
            visible: true,
            order: 9,
            component: 'Blog',
            description: 'Displays educational blogs, tutorials, technology insights, innovation articles, and empowerment content.'
        },

        {
            sectionId: 'testimonials',
            title: 'Testimonials & Community Feedback',
            visible: true,
            order: 10,
            component: 'TestimonialSlider',
            description: 'Shows real feedback, experiences, and trust stories from users, businesses, students, and communities.'
        },

        {
            sectionId: 'tech-platforms',
            title: 'Technologies & Platforms',
            visible: true,
            order: 11,
            component: 'TechPlatforms',
            description: 'Highlights programming languages, frameworks, cloud systems, tools, and infrastructure technologies used by AngiSoft.'
        },

        {
            sectionId: 'faq',
            title: 'Frequently Asked Questions',
            visible: true,
            order: 12,
            component: 'FaqSection',
            description: 'Answers common questions about AngiSoft, products, services, technology, empowerment, and future vision.'
        },

        {
            sectionId: 'contact',
            title: 'Contact Section',
            visible: true,
            order: 13,
            component: 'ContactSection',
            description: 'Provides contact forms, communication channels, booking access, and project inquiry options.'
        }
    ];



    for (const section of homeSections) {
        await prisma.homePageSection.upsert({
            where: { sectionId: section.sectionId },
            update: section,
            create: section
        });
    }
    console.log(`  ✅ ${homeSections.length} home page sections seeded`);

    console.log('\n🎉 Seeding complete!\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
