import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const hash = await bcrypt.hash(password, 10);

    // create admin employee if not exists
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
                twoFactorSecret: null
            }
        });
        console.log('Admin user created with email admin@angisoft-technologies.com');
    } else {
        console.log('Admin user already exists');
    }

    // create sample settings
    await prisma.setting.upsert({
        where: { key: 'site:home' },
        update: {},
        create: { key: 'site:home', value: { title: 'AngiSoft Technologies', subtitle: 'Innovative Software Solutions' } }
    });

    // sample service
    await prisma.service.upsert({
        where: { slug: 'custom-software-development' },
        update: {},
        create: { title: 'Custom Software Development', slug: 'custom-software-development', description: 'We build scalable software solutions tailored to your needs.', priceFrom: 5000 }
    });

    // sample project
    await prisma.project.upsert({
        where: { slug: 'sample-project' },
        update: {},
        create: { title: 'Sample Project', slug: 'sample-project', description: 'A sample project migrated from legacy portfolio.', type: 'product', images: [], techStack: ['Node.js', 'React'] }
    });

    // sample blog post (ensure admin exists)
    const admin = await prisma.employee.findUnique({ where: { email: 'admin@angisoft-technologies.com' } });
    if (admin) {
        await prisma.blogPost.upsert({
            where: { slug: 'welcome' },
            update: {},
            create: { title: 'Welcome to AngiSoft', slug: 'welcome', content: 'This is the first blog post.', authorId: admin.id, tags: ['welcome'], published: true, publishedAt: new Date() }
        });
    }

    console.log('Seeding complete');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
