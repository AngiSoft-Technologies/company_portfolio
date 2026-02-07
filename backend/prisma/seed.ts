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
                firstName: 'Admin',
                lastName: 'AngiSoft',
                email: 'admin@angisoft.co.ke',
                role: 'ADMIN',
                username: 'admin',
                passwordHash: hash,
                twoFactorEnabled: false,
                twoFactorSecret: null,
                acceptedAt: new Date(),
                bio: 'System Administrator for AngiSoft Technologies'
            }
        });
        console.log('✅ Admin user created');
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
                    linkedin: "https://linkedin.com/company/angisofttechnologies",
                    twitter: "https://twitter.com/angisofttech",
                    github: "https://github.com/angisofttechnologies",
                    facebook: "https://facebook.com/angisofttechnologies"
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
            title: 'PayQuick Mobile Banking',
            slug: 'payquick-mobile-banking',
            description: 'A comprehensive mobile banking application for a leading fintech startup. Features include mobile money integration, bill payments, and real-time transaction tracking.',
            type: 'Mobile App',
            images: ['/images/projects/payquick.jpg'],
            techStack: ['React Native', 'Node.js', 'PostgreSQL', 'Redis', 'M-Pesa API'],
            demoUrl: 'https://payquick.example.com',
            published: true
        },
        {
            title: 'LogiTrack Fleet Management',
            slug: 'logitrack-fleet-management',
            description: 'Real-time fleet tracking and management system with GPS integration, driver analytics, and automated reporting. Reduced operational costs by 30% for our client.',
            type: 'Web Application',
            images: ['/images/projects/logitrack.jpg'],
            techStack: ['React', 'Express.js', 'MongoDB', 'Socket.io', 'Google Maps API'],
            demoUrl: 'https://logitrack.example.com',
            published: true
        },
        {
            title: 'HealthConnect Telemedicine',
            slug: 'healthconnect-telemedicine',
            description: 'HIPAA-compliant telemedicine platform enabling virtual consultations, appointment scheduling, and electronic health records management.',
            type: 'Healthcare Platform',
            images: ['/images/projects/healthconnect.jpg'],
            techStack: ['Next.js', 'TypeScript', 'PostgreSQL', 'WebRTC', 'AWS'],
            published: true
        },
        {
            title: 'EduLearn LMS',
            slug: 'edulearn-lms',
            description: 'Feature-rich learning management system with course creation, progress tracking, certificates, and gamification elements. Used by 10,000+ students.',
            type: 'Education Platform',
            images: ['/images/projects/edulearn.jpg'],
            techStack: ['Vue.js', 'Django', 'PostgreSQL', 'Celery', 'S3'],
            demoUrl: 'https://edulearn.example.com',
            published: true
        },
        {
            title: 'AgriMarket E-Commerce',
            slug: 'agrimarket-ecommerce',
            description: 'B2B agricultural marketplace connecting farmers directly with buyers. Features real-time pricing, logistics integration, and mobile money payments.',
            type: 'E-Commerce',
            images: ['/images/projects/agrimarket.jpg'],
            techStack: ['React', 'Node.js', 'MongoDB', 'M-Pesa', 'Twilio'],
            published: true
        },
        {
            title: 'Smart Inventory System',
            slug: 'smart-inventory-system',
            description: 'AI-powered inventory management with demand forecasting, automated reordering, and multi-warehouse support for retail chains.',
            type: 'Enterprise Software',
            images: ['/images/projects/inventory.jpg'],
            techStack: ['Angular', 'Python', 'TensorFlow', 'PostgreSQL', 'Docker'],
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
                title: 'The Future of AI in Software Development',
                slug: 'future-of-ai-software-development',
                content: `Artificial Intelligence is revolutionizing how we build software. From code generation to automated testing, AI tools are becoming essential in modern development workflows.

## Key Trends

1. **AI-Powered Code Completion** - Tools like GitHub Copilot are changing how developers write code
2. **Automated Testing** - AI can generate test cases and identify edge cases
3. **Bug Detection** - Machine learning models can predict potential bugs before they happen

## What This Means for Developers

The role of developers is evolving. Rather than being replaced by AI, developers are becoming more productive by leveraging these tools to focus on higher-level problem solving.

At AngiSoft Technologies, we're embracing these changes to deliver better solutions faster.`,
                tags: ['AI', 'Development', 'Future Tech'],
                published: true,
                publishedAt: new Date('2025-12-15')
            },
            {
                title: 'Building Scalable Cloud Architecture',
                slug: 'building-scalable-cloud-architecture',
                content: `Cloud architecture is the foundation of modern applications. Here's how to design systems that grow with your business.

## Core Principles

1. **Design for Failure** - Assume components will fail and build redundancy
2. **Scale Horizontally** - Add more instances rather than bigger machines
3. **Automate Everything** - Use Infrastructure as Code for reproducibility

## Best Practices

- Use managed services where possible
- Implement proper monitoring and alerting
- Design for security from the start

Our team has extensive experience in AWS, Azure, and Google Cloud platforms.`,
                tags: ['AWS', 'Cloud', 'DevOps', 'Architecture'],
                published: true,
                publishedAt: new Date('2025-12-10')
            },
            {
                title: 'Mobile App Development Trends 2026',
                slug: 'mobile-app-trends-2026',
                content: `Stay ahead of the curve with the latest trends in mobile app development.

## Top Trends

1. **Cross-Platform Development** - React Native and Flutter continue to dominate
2. **5G-Enabled Apps** - New possibilities with faster connectivity
3. **AI Integration** - On-device ML for smarter apps

## Framework Comparison

| Framework | Performance | Dev Speed | Community |
|-----------|-------------|-----------|-----------|
| React Native | Good | Fast | Large |
| Flutter | Excellent | Fast | Growing |
| Native | Best | Slower | Largest |

Contact us to discuss your mobile app project.`,
                tags: ['Mobile', 'Flutter', 'React Native', 'Trends'],
                published: true,
                publishedAt: new Date('2025-12-05')
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
            name: 'Sarah Johnson',
            company: 'TechStart Inc.',
            role: 'CEO',
            text: "AngiSoft Technologies delivered our mobile app ahead of schedule. Their team's expertise and communication were exceptional throughout the project. We've seen a 40% increase in user engagement since launch.",
            rating: 5,
            confirmed: true
        },
        {
            name: 'Michael Oduya',
            company: 'PayQuick Kenya',
            role: 'Founder',
            text: "Working with AngiSoft was a game-changer for our fintech startup. They built a secure, scalable payment platform that our customers love. The attention to security and compliance was impressive.",
            rating: 5,
            confirmed: true
        },
        {
            name: 'Jennifer Wanjiku',
            company: 'LogiTrack',
            role: 'Operations Manager',
            text: "The fleet management system AngiSoft built for us has reduced our operational costs by 30%. Their ongoing support and maintenance have been invaluable. Highly recommend their services!",
            rating: 5,
            confirmed: true
        },
        {
            name: 'David Mwangi',
            company: 'HealthTech Africa',
            role: 'CTO',
            text: "AngiSoft's technical expertise is unmatched. They delivered a HIPAA-compliant telemedicine platform that has transformed healthcare delivery in our region. Professional team with excellent communication.",
            rating: 5,
            confirmed: true
        },
        {
            name: 'Grace Akinyi',
            company: 'EduLearn Institute',
            role: 'Director',
            text: "Our LMS platform by AngiSoft has revolutionized how we deliver education. The intuitive design and robust features have increased student engagement by 60%. Exceptional work!",
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
            firstName: 'John',
            lastName: 'Kamau',
            email: 'john.kamau@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            bio: 'Full-stack developer with 8+ years of experience in building scalable web applications. Specializes in React, Node.js, and cloud architecture.',
            avatarUrl: '/images/team/john-kamau.jpg'
        },
        {
            firstName: 'Mary',
            lastName: 'Njeri',
            email: 'mary.njeri@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            bio: 'Senior mobile developer and UI/UX enthusiast. Expert in React Native and Flutter with a passion for creating beautiful user experiences.',
            avatarUrl: '/images/team/mary-njeri.jpg'
        },
        {
            firstName: 'Peter',
            lastName: 'Ochieng',
            email: 'peter.ochieng@angisoft.co.ke',
            role: 'DEVELOPER' as const,
            bio: 'DevOps engineer and cloud architect. AWS certified with expertise in CI/CD pipelines, containerization, and infrastructure automation.',
            avatarUrl: '/images/team/peter-ochieng.jpg'
        },
        {
            firstName: 'Faith',
            lastName: 'Wambui',
            email: 'faith.wambui@angisoft.co.ke',
            role: 'MARKETING' as const,
            bio: 'Marketing strategist with a focus on tech companies. Specializes in digital marketing, content strategy, and brand development.',
            avatarUrl: '/images/team/faith-wambui.jpg'
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
