/**
 * Showcase seed — populates the public Projects and Solutions collections so
 * /projects, /solutions and industry detail pages have real evidence to render.
 *
 * Projects are anchored to AngiSoft's actual products (PetroFlow, DukaFlow,
 * KejaLink, AngiTunes) and the Digital Headquarters platform itself — real work,
 * not fabricated client references. Replace/extend via the admin UI afterwards.
 *
 * Run:  npm run seed:showcase   (or: npx ts-node prisma/seed-showcase.ts)
 * Idempotent: skips records whose slug already exists.
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/db';
import { ts, newId } from '../src/prisma/db';

const img = (name: string) => `/uploads/public/images/services/${name}`;

const PROJECTS = [
  {
    title: 'AngiSoft Digital Headquarters',
    slug: 'angisoft-digital-headquarters',
    type: 'platform',
    industry: 'professional-services',
    featured: true,
    description:
      'The complete online office behind angisoft.co.ke: public portfolio, CMS-driven content, client portal, booking workflows, staff operating system with permission-driven dashboards, and a sales pipeline from lead to invoice. React + Express + Prisma on Neon PostgreSQL.',
    images: [img('software-development.jpg'), img('system-design.jpg')],
    techStack: ['React 19', 'TypeScript', 'Express', 'Prisma', 'PostgreSQL', 'Tailwind CSS', 'Socket.IO'],
    seoTitle: 'AngiSoft Digital Headquarters Platform',
    seoDesc: 'How AngiSoft runs its entire company online: portfolio, client portal, staff OS and CRM on one platform.',
  },
  {
    title: 'PetroFlow — Fuel Station Operations',
    slug: 'petroflow-fuel-operations',
    type: 'product',
    industry: 'fuel-energy',
    featured: true,
    description:
      'PetroFlow is AngiSoft’s fuel station and petroleum operations platform: stock tracking, shift management, sales reporting and station workflows in one system built for fuel retail operations.',
    images: [img('enterprise.jpg'), img('data-analytics.jpg')],
    techStack: ['React', 'Node.js', 'PostgreSQL', 'REST API'],
    seoTitle: 'PetroFlow Fuel Station Management',
    seoDesc: 'Fuel station stock, shift and sales management platform by AngiSoft Technologies.',
  },
  {
    title: 'DukaFlow — Retail & Shop Management',
    slug: 'dukaflow-retail-management',
    type: 'product',
    industry: 'retail',
    featured: true,
    description:
      'DukaFlow is AngiSoft’s retail and business management product: sales, inventory, expenses, customer records and reporting for shops and SMEs that need practical daily operations software.',
    images: [img('retail-bg.jpg'), img('web-mobile.jpg')],
    techStack: ['React', 'Node.js', 'PostgreSQL', 'PWA'],
    seoTitle: 'DukaFlow Retail Management Software',
    seoDesc: 'Sales, inventory and expense management for shops and SMEs by AngiSoft Technologies.',
  },
  {
    title: 'KejaLink — Property & Rental Platform',
    slug: 'kejalink-property-platform',
    type: 'product',
    industry: 'real-estate',
    featured: true,
    description:
      'KejaLink is AngiSoft’s property and housing platform: rental listings, tenant records, maintenance requests and landlord–tenant communication in one place.',
    images: [img('realestate-bg.jpg'), img('web-mobile.jpg')],
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Maps API'],
    seoTitle: 'KejaLink Property Management Platform',
    seoDesc: 'Rental listings, tenant records and maintenance workflows by AngiSoft Technologies.',
  },
  {
    title: 'AngiTunes — Creator Distribution Platform',
    slug: 'angitunes-creator-platform',
    type: 'product',
    industry: 'creative',
    featured: false,
    description:
      'AngiTunes is AngiSoft’s creator economy platform direction: helping upcoming artists, DJs and creators distribute, organize and monetise their work.',
    images: [img('graphic-design.jpg'), img('web-mobile.jpg')],
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Media pipeline'],
    seoTitle: 'AngiTunes Creator Platform',
    seoDesc: 'Distribution and monetisation tools for artists and creators by AngiSoft Technologies.',
  },
  {
    title: 'School Management & E-Learning Systems',
    slug: 'school-management-elearning',
    type: 'capability',
    industry: 'education',
    featured: false,
    description:
      'AngiSoft delivers school management, e-learning and examination systems: student records, attendance, assessments and parent communication built around how institutions actually operate.',
    images: [img('education-bg.jpg'), img('software-development.jpg')],
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Offline-first PWA'],
    seoTitle: 'School Management & E-Learning Development',
    seoDesc: 'School management, e-learning and examination systems by AngiSoft Technologies.',
  },
];

const SOLUTIONS = [
  { name: 'Custom Software Development', slug: 'custom-software', description: 'Tailored web and mobile applications engineered around your workflows, built with modern TypeScript stacks and delivered with documentation and support.', icon: 'FaCode', sortOrder: 1 },
  { name: 'Business Management Platforms', slug: 'business-management', description: 'POS, inventory, sales, HR and operations platforms for retail, fuel, property and services — like PetroFlow, DukaFlow and KejaLink.', icon: 'FaBriefcase', sortOrder: 2 },
  { name: 'Data & Analytics', slug: 'data-analytics', description: 'Dashboards, reporting pipelines and data automation that turn operational data into decisions you can act on.', icon: 'FaChartBar', sortOrder: 3 },
  { name: 'Cloud & Infrastructure', slug: 'cloud-infrastructure', description: 'Deployment, scaling, backups and reliability engineering on modern cloud infrastructure with clear operational ownership.', icon: 'FaCloud', sortOrder: 4 },
  { name: 'AI & Automation', slug: 'ai-automation', description: 'Workflow automation, AI-assisted features and intelligent document processing embedded into the tools your team already uses.', icon: 'FaRobot', sortOrder: 5 },
  { name: 'E-Commerce & Marketplaces', slug: 'ecommerce-marketplaces', description: 'Online stores, booking commerce and marketplace features with payments, catalogue management and order workflows.', icon: 'FaShoppingCart', sortOrder: 6 },
];

async function main() {
  console.log('Seeding showcase content...\n');

  let createdProjects = 0;
  for (const p of PROJECTS) {
    const existing = await prisma.orm.public.Project.where({ slug: p.slug }).first();
    if (existing) { console.log(`  = project "${p.slug}" exists, skipping`); continue; }
    await prisma.orm.public.Project.create({
      id: newId(),
      updatedAt: ts(),
      title: p.title,
      slug: p.slug,
      description: p.description,
      _type: p.type,
      images: p.images,
      techStack: p.techStack,
      industry: p.industry,
      featured: p.featured,
      published: true,
      seoTitle: p.seoTitle,
      seoDesc: p.seoDesc,
    } as any);
    createdProjects++;
    console.log(`  + project "${p.slug}"`);
  }

  let createdSolutions = 0;
  for (const s of SOLUTIONS) {
    const existing = await prisma.orm.public.Solution.where({ slug: s.slug }).first();
    if (existing) { console.log(`  = solution "${s.slug}" exists, skipping`); continue; }
    await prisma.orm.public.Solution.create({
      id: newId(),
      updatedAt: ts(),
      name: s.name,
      slug: s.slug,
      description: s.description,
      icon: s.icon,
      sortOrder: s.sortOrder,
      active: true,
    } as any);
    createdSolutions++;
    console.log(`  + solution "${s.slug}"`);
  }

  console.log(`\nDone: ${createdProjects} projects, ${createdSolutions} solutions seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
