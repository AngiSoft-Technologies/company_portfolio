import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

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
                lastName: 'admin',
                email: 'admin@angisoft.co.ke',
                role: 'ADMIN',
                username: null,
                passwordHash: hash,
                twoFactorEnabled: false,
                twoFactorSecret: null,
                acceptedAt: new Date(),
                bio: 'System Administrator for AngiSoft Technologies',
                phone: '+254710398690'
            }
        });
        console.log('✅ Admin user created (email: admin@angisoft.co.ke, password: from ADMIN_PASSWORD env or default)');
    } else {
        console.log('ℹ️  Admin user already exists');
    }

    const admin = await prisma.employee.findUnique({ where: { email: 'admin@angisoft.co.ke' } });

    // ==================== SITE SETTINGS ====================
    console.log('\n📝 Seeding site settings...');

    // Hero Section
    await prisma.setting.upsert({
        where: { key: 'site_hero' },
        update: {},
        create: {
            key: 'site_hero',
            value: {
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
            }
        }
    });
    console.log('  ✅ Hero settings');

    // About Section
    await prisma.setting.upsert({
        where: { key: 'site_about' },
        update: {},
        create: {
            key: 'site_about',
            value: {
                title: "Who We Are",
                subtitle: "Your Trusted Technology Partner",
                description: [
                    "AngiSoft Technologies is a premier software development company headquartered in Kenya, serving clients across Africa and globally. We specialize in building innovative, scalable, and secure digital solutions that drive business growth.",
                    "Our team of skilled developers, designers, and engineers are passionate about technology and committed to delivering excellence. We combine technical expertise with business acumen to create solutions that truly make an impact.",
                    "From startups to enterprises, we partner with organizations of all sizes to transform their ideas into powerful software products. Our client-centric approach ensures that every solution we deliver is tailored to meet your unique needs."
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
                ]
            }
        }
    });
    console.log('  ✅ About settings');

    // Contact Section
    await prisma.setting.upsert({
        where: { key: 'site_contact' },
        update: {},
        create: {
            key: 'site_contact',
            value: {
                companyName: "AngiSoft Technologies",
                email: "info@angisoft.co.ke",
                phone: "+254710398690",
                whatsapp: "+254710398690",
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
                    linkedin: "https://linkedin.com/company/angisoft-technologies",
                    twitter: "https://x.com/angisofttech",
                    github: "https://github.com/angisoft-technologies",
                    facebook: "https://facebook.com/angisoft.technologies"
                }
            }
        }
    });
    console.log('  ✅ Contact settings');

    // Footer Section
    await prisma.setting.upsert({
        where: { key: 'site_footer' },
        update: {},
        create: {
            key: 'site_footer',
            value: {
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
            }
        }
    });
    console.log('  ✅ Footer settings');

    // Branding
    await prisma.setting.upsert({
        where: { key: 'site_branding' },
        update: {},
        create: {
            key: 'site_branding',
            value: {
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
            }
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

    // Booking Copy (Headings, steps, labels)
    await prisma.setting.upsert({
        where: { key: 'site_booking' },
        update: {},
        create: {
            key: 'site_booking',
            value: {
                hero: {
                    badge: 'Start Your Project',
                    title: 'Request a',
                    highlight: 'Project'
                },
                success: {
                    title: 'Booking Submitted!',
                    message: 'Your booking has been received. We will reach out within 24 hours.'
                },
                labels: {
                    next: 'Next',
                    back: 'Back',
                    submit: 'Submit Booking',
                    submitting: 'Submitting...',
                    viewStatus: 'View Status',
                    returnHome: 'Return Home'
                },
                steps: [
                    { title: 'Basic Information', icon: 'FaUser' },
                    { title: 'Project Details', icon: 'FaFileAlt' },
                    { title: 'Upload Files (Optional)', icon: 'FaCloudUploadAlt' }
                ],
                paymentStep: {
                    title: 'Payment',
                    icon: 'FaCreditCard'
                },
                projectTypes: [
                    { value: 'SOFTWARE', label: 'Software Development', icon: '💻' },
                    { value: 'DATA_ANALYSIS', label: 'Data Analysis', icon: '📊' },
                    { value: 'CYBER_SERVICE', label: 'Cyber Services', icon: '🛡️' },
                    { value: 'ADVERTISING', label: 'Advertising', icon: '📣' },
                    { value: 'INTERNET_SERVICE', label: 'Internet Services', icon: '🌐' },
                    { value: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎬' },
                    { value: 'DOCUMENT_EDIT', label: 'Document Editing', icon: '📝' },
                    { value: 'REPORT', label: 'Reports & Posters', icon: '📄' },
                    { value: 'RESUME', label: 'Resume / CV', icon: '📎' },
                    { value: 'OTHER', label: 'Other', icon: '✨' }
                ]
            }
        }
    });
    console.log('  ✅ Booking copy settings');

    // ==================== SERVICES ====================
    console.log('\n🗂️  Seeding service categories...');

    const serviceCategories = [
        { name: 'Custom Software', slug: 'custom-software', description: 'Web apps, POS, management systems, and tailored solutions.', order: 1, published: true },
        { name: 'Automation & Debugging', slug: 'automation-debugging', description: 'Code debugging, optimization, and Bash automation.', order: 2, published: true },
        { name: 'Data Analysis', slug: 'data-analysis', description: 'Python/Excel analytics, dashboards, and reports.', order: 3, published: true },
        { name: 'Cyber Services', slug: 'cyber-services', description: 'Document editing, reports, thesis, posters, presentations.', order: 4, published: true },
        { name: 'Government Services', slug: 'government-services', description: 'KRA, SHA, and good conduct applications.', order: 5, published: true },
        { name: 'Advertising', slug: 'advertising', description: 'Product and staff promotion campaigns.', order: 6, published: true },
        { name: 'Internet Services', slug: 'internet-services', description: 'Coming soon.', order: 7, published: false },
        { name: 'Entertainment Services', slug: 'entertainment-services', description: 'Coming soon.', order: 8, published: false }
    ];

    await prisma.serviceCategory.createMany({
        data: serviceCategories,
        skipDuplicates: true
    });
    console.log('  ✅ Service categories');

    console.log('\n🛠️  Seeding services...');

    const categoryRecords = await prisma.serviceCategory.findMany();
    const categoryBySlug = new Map(categoryRecords.map((category) => [category.slug, category]));

    const services = [
        {
            title: 'Custom Software Development',
            slug: 'custom-software-development',
            description: 'End-to-end custom software solutions designed to meet your unique business requirements. From web applications to enterprise systems, we build scalable, secure, and maintainable software.',
            priceFrom: 5000,
            images: ['/images/Software-Development-Company.jpg'],
            published: true,
            categorySlug: 'custom-software',
            targetAudience: 'Startups, SMEs, Enterprises',
            scope: '4-12 weeks'
        },
        {
            title: 'Mobile App Development',
            slug: 'mobile-app-development',
            description: 'Native and cross-platform mobile applications for iOS and Android. We use Flutter and Kotlin to deliver high-performance mobile experiences.',
            priceFrom: 3000,
            images: ['/images/developer-8829735_1280.jpg'],
            published: true,
            categorySlug: 'custom-software',
            targetAudience: 'Businesses, Startups',
            scope: '6-14 weeks'
        },
        {
            title: 'POS & Management Systems',
            slug: 'pos-management-systems',
            description: 'Sales, inventory, and management platforms tailored for retail, hospitality, and service businesses. Includes reporting and role-based access.',
            priceFrom: 4000,
            images: ['/images/web-development.jpg'],
            published: true,
            categorySlug: 'custom-software',
            targetAudience: 'Retail, Hospitality, SMEs',
            scope: '6-10 weeks'
        },
        {
            title: 'Automation & Debugging',
            slug: 'automation-debugging',
            description: 'Code debugging, performance tuning, and automation with Bash scripting to streamline workflows and reduce manual effort.',
            priceFrom: 800,
            images: ['/images/programming-background-with-person-working-with-codes-computer.jpg'],
            published: true,
            categorySlug: 'automation-debugging',
            targetAudience: 'Engineering Teams, Operations',
            scope: '1-4 weeks'
        },
        {
            title: 'Data Analysis & Dashboards',
            slug: 'data-analysis-dashboards',
            description: 'Python and Excel-based analytics, dashboards, and reporting to help you make data-driven decisions.',
            priceFrom: 600,
            images: ['/images/developer-8829735_1280.jpg'],
            published: true,
            categorySlug: 'data-analysis',
            targetAudience: 'SMEs, Analysts, Teams',
            scope: '1-3 weeks'
        },
        {
            title: 'Cyber Document Services',
            slug: 'cyber-document-services',
            description: 'Document editing and formatting for reports, thesis, posters, presentations, and attachments.',
            priceFrom: 50,
            images: ['/images/Software-Development-Company.jpg'],
            published: true,
            categorySlug: 'cyber-services',
            targetAudience: 'Students, Professionals, SMEs',
            scope: '2-5 days'
        },
        {
            title: 'KRA & SHA Applications',
            slug: 'kra-sha-applications',
            description: 'We automate and assist with KRA, SHA, and good conduct applications through our system.',
            priceFrom: 30,
            images: ['/images/web-development.jpg'],
            published: true,
            categorySlug: 'government-services',
            targetAudience: 'Individuals, SMEs',
            scope: '1-3 days'
        },
        {
            title: 'Advertising & Brand Promotion',
            slug: 'advertising-brand-promotion',
            description: 'Campaigns to promote your products and staff, with creative assets and reporting.',
            priceFrom: 200,
            images: ['/images/programming-background-with-person-working-with-codes-computer.jpg'],
            published: true,
            categorySlug: 'advertising',
            targetAudience: 'Businesses, Startups',
            scope: '2-4 weeks'
        },
        {
            title: 'Internet Services (Coming Soon)',
            slug: 'internet-services',
            description: 'Reliable internet services for homes and businesses. Coming soon.',
            priceFrom: 0,
            images: ['/images/Software-Development-Company.jpg'],
            published: false,
            categorySlug: 'internet-services',
            targetAudience: 'Homes, Businesses',
            scope: 'TBD'
        },
        {
            title: 'Entertainment Services (Coming Soon)',
            slug: 'entertainment-services',
            description: 'Entertainment offerings and digital media solutions. Coming soon.',
            priceFrom: 0,
            images: ['/images/web-development.jpg'],
            published: false,
            categorySlug: 'entertainment-services',
            targetAudience: 'General Audience',
            scope: 'TBD'
        }
    ];

    for (const service of services) {
        const { categorySlug, ...serviceData } = service as any;
        const category = categorySlug ? categoryBySlug.get(categorySlug) : null;
        await prisma.service.upsert({
            where: { slug: serviceData.slug },
            update: {
                ...serviceData,
                categoryId: category?.id,
                category: category?.name || serviceData.category || 'General',
                authorId: admin?.id
            },
            create: {
                ...serviceData,
                categoryId: category?.id,
                category: category?.name || serviceData.category || 'General',
                authorId: admin?.id
            }
        });
    }
    console.log(`  ✅ ${services.length} services seeded`);

    // ==================== PROJECTS ====================
    console.log('\n📁 Seeding projects...');

    const projects = [
        {
            title: 'E-Commerce Platform',
            slug: 'ecommerce-platform-kenya',
            description: 'Full-featured online shopping platform with mobile money integration, inventory management, and automated order processing. Built for a growing retail business in East Africa.',
            type: 'Web Application',
            images: ['/images/projects/ecommerce.jpg'],
            techStack: ['React', 'Node.js', 'PostgreSQL', 'M-Pesa API', 'Redis'],
            published: true
        },
        {
            title: 'School Management System',
            slug: 'school-management-system',
            description: 'Comprehensive school administration platform with student records, fee management, timetabling, and parent communication portal. Deployed across multiple institutions.',
            type: 'Web Application',
            images: ['/images/projects/school-system.jpg'],
            techStack: ['React', 'Express.js', 'PostgreSQL', 'PDF Generation'],
            published: true
        },
        {
            title: 'Fleet Tracking Solution',
            slug: 'fleet-tracking-solution',
            description: 'Real-time GPS tracking and management system for logistics companies. Features route optimization, driver analytics, and automated reporting.',
            type: 'Web & Mobile',
            images: ['/images/projects/fleet-tracking.jpg'],
            techStack: ['Flutter', 'Node.js', 'MongoDB', 'Google Maps API', 'Socket.io'],
            published: true
        },
        {
            title: 'Clinic Management App',
            slug: 'clinic-management-app',
            description: 'Patient records, appointment scheduling, and prescription management system for healthcare providers. HIPAA-compliant with secure data handling.',
            type: 'Healthcare Platform',
            images: ['/images/projects/clinic-app.jpg'],
            techStack: ['React', 'TypeScript', 'PostgreSQL', 'Stripe'],
            published: true
        },
        {
            title: 'Restaurant POS System',
            slug: 'restaurant-pos-system',
            description: 'Point-of-sale solution with table management, kitchen display, inventory tracking, and sales analytics. Designed for hospitality businesses.',
            type: 'POS System',
            images: ['/images/projects/restaurant-pos.jpg'],
            techStack: ['React', 'Node.js', 'PostgreSQL', 'Thermal Printing'],
            published: true
        },
        {
            title: 'Data Analytics Dashboard',
            slug: 'data-analytics-dashboard',
            description: 'Interactive business intelligence dashboard with real-time data visualization, custom reports, and predictive analytics for decision-making.',
            type: 'Data Analysis',
            images: ['/images/projects/analytics-dashboard.jpg'],
            techStack: ['Python', 'Pandas', 'PostgreSQL', 'D3.js', 'Excel Integration'],
            published: true
        }
    ];

    for (const project of projects) {
        await prisma.project.upsert({
            where: { slug: project.slug },
            update: { ...project, authorId: admin?.id },
            create: { ...project, authorId: admin?.id }
        });
    }
    console.log(`  ✅ ${projects.length} projects seeded`);

    // ==================== BLOG POSTS ====================
    console.log('\n📰 Seeding blog posts...');

    if (admin) {
        const posts = [
            {
                title: 'Why Every Business in Kenya Needs a Digital Presence in 2026',
                slug: 'why-kenyan-businesses-need-digital-presence-2026',
                content: `In today's fast-paced digital economy, having an online presence is no longer optional—it's essential for business growth and survival.

## The Digital Shift in East Africa

Kenya is at the forefront of digital transformation in Africa. With over 60% internet penetration and M-Pesa leading global mobile money innovation, businesses that embrace digital tools have a significant competitive advantage.

## Key Benefits of Going Digital

1. **Reach More Customers** - Your business is accessible 24/7 from anywhere
2. **Reduce Operating Costs** - Automate repetitive tasks and streamline operations
3. **Better Data & Insights** - Make informed decisions based on real customer data
4. **Improved Customer Service** - Respond faster and serve customers better

## What Digital Tools Do You Need?

- **Website or E-Commerce Platform** - Your online storefront
- **Mobile App** - For customer engagement and convenience
- **POS System** - Track sales, inventory, and customer data
- **Data Analytics** - Understand your business performance

At AngiSoft Technologies, we help Kenyan businesses build custom digital solutions tailored to their needs. From small shops to large enterprises, we've got you covered.

Ready to take your business digital? [Contact us today](/booking).`,
                tags: ['Digital Transformation', 'Business', 'Kenya', 'E-Commerce'],
                published: true,
                publishedAt: new Date('2026-01-20')
            },
            {
                title: 'How to Choose the Right Software Development Partner',
                slug: 'how-to-choose-software-development-partner',
                content: `Choosing the right software development company can make or break your project. Here's what to look for.

## Key Factors to Consider

### 1. Local Experience & Understanding
Your development partner should understand the Kenyan market, including M-Pesa integration, local payment methods, and business challenges unique to our region.

### 2. Technical Expertise
Look for companies with proven experience in the technologies your project needs:
- Web development (React, Node.js)
- Mobile apps (Flutter, React Native, Kotlin)
- Database management (PostgreSQL, MongoDB)
- Payment integration (M-Pesa, Stripe, PayPal)

### 3. Clear Communication
Your team should provide:
- Regular project updates
- Transparent pricing with no hidden costs
- Accessible support channels (phone, WhatsApp, email)

### 4. Portfolio & References
Ask to see previous work and talk to past clients. Real testimonials matter more than fancy marketing.

### 5. Ongoing Support
Software needs maintenance and updates. Ensure your partner offers post-delivery support.

## Red Flags to Avoid

- Promises that sound too good to be true
- No clear timeline or milestones
- Poor communication or delayed responses
- No written contract or agreement

## Why AngiSoft?

We're a Kenya-based team that understands local business needs. We've delivered 100+ projects across retail, education, healthcare, and logistics. Our clients stay with us because we deliver quality work on time and provide excellent ongoing support.

[Start your project with us](/booking) or [view our portfolio](/#projects).`,
                tags: ['Software Development', 'Business Tips', 'Technology'],
                published: true,
                publishedAt: new Date('2026-01-15')
            },
            {
                title: 'The Complete Guide to M-Pesa Integration for Your Business',
                slug: 'complete-guide-mpesa-integration',
                content: `M-Pesa is Kenya's most popular payment method. Here's everything you need to know about integrating it into your business.

## Why M-Pesa Integration Matters

With over 30 million active users in Kenya, M-Pesa is essential for any business accepting digital payments. Customers trust it, and it's more accessible than traditional banking.

## Integration Options

### 1. Paybill (For Businesses)
- Best for: Retail stores, service providers, recurring payments
- Automatic reconciliation
- Professional business image

### 2. Buy Goods Till Number
- Best for: Small businesses, quick setup
- Instant payments
- Lower setup requirements

### 3. M-Pesa Express (Lipa Na M-Pesa)
- Best for: E-commerce and online platforms
- STK Push for seamless checkout
- Real-time payment confirmation

## Technical Requirements

- Safaricom Daraja API credentials
- SSL certificate for your website
- Webhook endpoint for payment notifications
- Database to store transaction records

## Common Challenges & Solutions

**Challenge**: Payment confirmation delays
**Solution**: Implement webhook handlers and queue systems for reliability

**Challenge**: Failed transactions
**Solution**: Automatic retry logic and clear user notifications

**Challenge**: Reconciliation difficulties
**Solution**: Automated matching between M-Pesa statements and your database

## How We Can Help

AngiSoft has integrated M-Pesa into 50+ applications. We handle:
- API integration and testing
- Security and compliance
- Payment reconciliation
- Error handling and retries
- Customer notifications

Whether you need M-Pesa for your POS system, e-commerce platform, or mobile app, we've got the expertise.

[Get a free consultation](/booking) on M-Pesa integration.`,
                tags: ['M-Pesa', 'Payments', 'Integration', 'Kenya'],
                published: true,
                publishedAt: new Date('2026-01-10')
            }
        ];

        for (const post of posts) {
            await prisma.blogPost.upsert({
                where: { slug: post.slug },
                update: { ...post, authorId: admin.id },
                create: { ...post, authorId: admin.id }
            });
        }
        console.log(`  ✅ ${posts.length} blog posts seeded`);
    }

    // ==================== TESTIMONIALS ====================
    console.log('\n⭐ Seeding testimonials...');

    const testimonials = [
        {
            name: 'Grace Muthoni',
            company: 'Savannah Retail Ltd',
            role: 'Operations Manager',
            text: "AngiSoft built our POS system and it has completely transformed how we manage our stores. Sales tracking, inventory, and reporting all work seamlessly. The team was professional and delivered on time.",
            rating: 5,
            confirmed: true
        },
        {
            name: 'Daniel Kipchoge',
            company: 'Greenfield Academy',
            role: 'Principal',
            text: "The school management system from AngiSoft has made administration so much easier. Fee collection, student records, and parent communication are now all in one place. Highly recommended!",
            rating: 5,
            confirmed: true
        },
        {
            name: 'Alice Wanjiru',
            company: 'HealthCare Plus Clinic',
            role: 'Medical Director',
            text: "We needed a secure patient management system and AngiSoft delivered exactly what we needed. Appointment scheduling and records management work perfectly. Their support has been excellent.",
            rating: 5,
            confirmed: true
        },
        {
            name: 'James Omondi',
            company: 'Swift Logistics',
            role: 'Fleet Manager',
            text: "The fleet tracking solution has saved us thousands in fuel costs and improved our delivery times. Real-time tracking and route optimization are game changers for our business.",
            rating: 5,
            confirmed: true
        },
        {
            name: 'Mary Kamau',
            company: 'Nairobi Fashion Hub',
            role: 'Founder',
            text: "Our e-commerce platform by AngiSoft has exceeded expectations. M-Pesa integration works flawlessly and our online sales have grown by 250%. Worth every shilling!",
            rating: 5,
            confirmed: true
        }
    ];

    for (const testimonial of testimonials) {
        const existing = await prisma.testimonial.findFirst({ where: { name: testimonial.name, company: testimonial.company } });
        if (!existing) {
            await prisma.testimonial.create({ data: testimonial });
        }
    }
    console.log(`  ✅ ${testimonials.length} testimonials seeded`);

    // ==================== STAFF MEMBERS ====================
    console.log('\n👥 Seeding staff members...');

    const staffMembers = [
        {
            firstName: 'David',
            lastName: 'Kimani',
            email: 'david.kimani@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            bio: 'Full-stack developer specializing in React, Node.js, and PostgreSQL. 6+ years building web and mobile applications for East African businesses.',
            avatarUrl: '/images/team/david-kimani.jpg',
            phone: '+254712345678'
        },
        {
            firstName: 'Sarah',
            lastName: 'Njeri',
            email: 'sarah.njeri@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            bio: 'Mobile developer with expertise in Flutter and Kotlin. Passionate about creating intuitive user experiences for Android and iOS platforms.',
            avatarUrl: '/images/team/sarah-njeri.jpg',
            phone: '+254723456789'
        },
        {
            firstName: 'Brian',
            lastName: 'Odhiambo',
            email: 'brian.odhiambo@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            bio: 'Data analyst and Python specialist. Creates business intelligence dashboards and automated reporting solutions using Excel and Python.',
            avatarUrl: '/images/team/brian-odhiambo.jpg',
            phone: '+254734567890'
        },
        {
            firstName: 'Lucy',
            lastName: 'Wambui',
            email: 'lucy.wambui@angisoft.co.ke',
            role: 'MARKETING' as const,
            bio: 'Digital marketing specialist focused on tech companies. Manages brand development, content strategy, and client communications.',
            avatarUrl: '/images/team/lucy-wambui.jpg',
            phone: '+254745678901'
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
        // General
        { question: 'What services does AngiSoft Technologies offer?', answer: 'We offer custom software development (web & mobile apps, POS systems), data analysis & dashboards, cyber/document services (reports, thesis, posters, presentations), government application support (KRA, SHA, Good Conduct), advertising & brand promotion, and more.', category: 'General', order: 1 },
        { question: 'Where is AngiSoft Technologies located?', answer: 'We are based in Nairobi, Kenya but serve clients across Africa and globally. You can reach us at +254710398690 (call or WhatsApp) or email info@angisoft.co.ke.', category: 'General', order: 2 },
        { question: 'What are your working hours?', answer: 'Our team is available Monday to Friday, 8:00 AM – 6:00 PM (EAT), and Saturdays 9:00 AM – 1:00 PM. For urgent matters, WhatsApp us at +254710398690.', category: 'General', order: 3 },
        { question: 'How can I contact you?', answer: 'You can reach us via: 📞 Phone/WhatsApp: +254710398690, 📧 General: info@angisoft.co.ke, 📧 Support: support@angisoft.co.ke, or use the chat bot on our website for instant help.', category: 'General', order: 4 },
        // Bookings & Projects
        { question: 'How do I start a project with you?', answer: 'Simply visit our booking page and fill out the project request form. Select your project type, describe your requirements, and optionally upload reference files. Our team reviews every submission within 24 hours.', category: 'Bookings & Projects', order: 1 },
        { question: 'What happens after I submit a booking?', answer: 'Your booking goes through these stages: Submitted → Under Review → Accepted → Terms Accepted → Deposit Paid → In Progress → Delivered → Completed. You will receive email updates at each stage.', category: 'Bookings & Projects', order: 2 },
        { question: 'What file types can I upload with my booking?', answer: 'You can upload PDFs, images (JPG, PNG), Word documents, Excel files, and plain text files. Maximum 5 files, 10MB total.', category: 'Bookings & Projects', order: 3 },
        { question: 'Can I track my project status?', answer: 'Yes! After submitting a booking, you will receive a booking reference. Use it on our Booking Status page to track progress in real time.', category: 'Bookings & Projects', order: 4 },
        // Payments
        { question: 'What payment methods do you accept?', answer: 'We accept M-Pesa, Stripe (Visa/Mastercard), and PayPal. Payment details are provided after your booking is accepted and terms are agreed upon.', category: 'Payments', order: 1 },
        { question: 'Is a deposit required?', answer: 'Yes, a deposit (typically 30-50% of the project cost) is required before work begins. The remaining balance is due upon project delivery.', category: 'Payments', order: 2 },
        // Technical
        { question: 'What technologies do you use?', answer: 'We build with modern stacks including React, React Native, Flutter, Kotlin, Node.js, Python, TypeScript, PostgreSQL, AWS, and more. We choose the best technology for each project.', category: 'Technical', order: 1 },
        { question: 'Do you provide ongoing support after delivery?', answer: 'Yes! We offer maintenance packages and ongoing support. All projects include a 30-day post-delivery support period at no extra cost.', category: 'Technical', order: 2 },
        // Newsletter
        { question: 'How do I stay updated with AngiSoft news?', answer: 'Subscribe to our newsletter at the bottom of any page! We send updates about new services, tech insights, and special offers from updates@angisoft.co.ke. You can unsubscribe at any time.', category: 'Newsletter', order: 1 },
    ];

    for (const faq of faqs) {
        const existing = await prisma.faq.findFirst({ where: { question: faq.question } });
        if (!existing) {
            await prisma.faq.create({ data: { ...faq, published: true } });
        }
    }
    console.log(`  ✅ ${faqs.length} FAQs seeded`);

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
