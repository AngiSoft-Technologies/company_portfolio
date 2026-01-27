import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting comprehensive database seed...\n');

    // ==================== ADMIN USER ====================
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const hash = await bcrypt.hash(password, 10);

    const existing = await prisma.employee.findUnique({ where: { email: 'admin@angisoft-technologies.com' } });
    if (!existing) {
        await prisma.employee.create({
            data: {
                firstName: 'Admin',
                lastName: 'AngiSoft',
                email: 'admin@angisoft-technologies.com',
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

    const admin = await prisma.employee.findUnique({ where: { email: 'admin@angisoft-technologies.com' } });

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

    // ==================== SERVICES ====================
    console.log('\n🛠️  Seeding services...');

    const services = [
        {
            title: 'Custom Software Development',
            slug: 'custom-software-development',
            description: 'End-to-end custom software solutions designed to meet your unique business requirements. From web applications to enterprise systems, we build scalable, secure, and maintainable software.',
            priceFrom: 5000,
            images: ['/images/services/software-dev.jpg'],
            published: true
        },
        {
            title: 'Mobile App Development',
            slug: 'mobile-app-development',
            description: 'Native and cross-platform mobile applications for iOS and Android. We use React Native, Flutter, and native technologies to deliver high-performance mobile experiences.',
            priceFrom: 3000,
            images: ['/images/services/mobile-dev.jpg'],
            published: true
        },
        {
            title: 'Cloud Solutions & DevOps',
            slug: 'cloud-solutions-devops',
            description: 'Cloud architecture, migration, and DevOps services. We help you leverage AWS, Azure, and Google Cloud for scalable, cost-effective infrastructure.',
            priceFrom: 2500,
            images: ['/images/services/cloud-devops.jpg'],
            published: true
        },
        {
            title: 'UI/UX Design',
            slug: 'ui-ux-design',
            description: 'User-centered design that delights. Our design team creates intuitive, beautiful interfaces that enhance user engagement and drive conversions.',
            priceFrom: 1500,
            images: ['/images/services/ui-ux.jpg'],
            published: true
        },
        {
            title: 'API Development & Integration',
            slug: 'api-development-integration',
            description: 'RESTful and GraphQL API development, third-party integrations, and microservices architecture. Connect your systems seamlessly.',
            priceFrom: 2000,
            images: ['/images/services/api-dev.jpg'],
            published: true
        },
        {
            title: 'Technical Consulting',
            slug: 'technical-consulting',
            description: 'Expert guidance on technology strategy, architecture decisions, and digital transformation. We help you make informed decisions.',
            priceFrom: 500,
            images: ['/images/services/consulting.jpg'],
            published: true
        }
    ];

    for (const service of services) {
        await prisma.service.upsert({
            where: { slug: service.slug },
            update: { ...service, authorId: admin?.id },
            create: { ...service, authorId: admin?.id }
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
            email: 'john.kamau@angisoft-technologies.com',
            role: 'DEVELOPER' as const,
            bio: 'Full-stack developer with 8+ years of experience in building scalable web applications. Specializes in React, Node.js, and cloud architecture.',
            avatarUrl: '/images/team/john-kamau.jpg'
        },
        {
            firstName: 'Mary',
            lastName: 'Njeri',
            email: 'mary.njeri@angisoft-technologies.com',
            role: 'DEVELOPER' as const,
            bio: 'Senior mobile developer and UI/UX enthusiast. Expert in React Native and Flutter with a passion for creating beautiful user experiences.',
            avatarUrl: '/images/team/mary-njeri.jpg'
        },
        {
            firstName: 'Peter',
            lastName: 'Ochieng',
            email: 'peter.ochieng@angisoft-technologies.com',
            role: 'DEVELOPER' as const,
            bio: 'DevOps engineer and cloud architect. AWS certified with expertise in CI/CD pipelines, containerization, and infrastructure automation.',
            avatarUrl: '/images/team/peter-ochieng.jpg'
        },
        {
            firstName: 'Faith',
            lastName: 'Wambui',
            email: 'faith.wambui@angisoft-technologies.com',
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
