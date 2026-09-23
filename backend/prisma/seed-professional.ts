/**
 * Seeds the professional-identity + permission infrastructure:
 *   Department, Position, PermissionPreset
 *
 * Idempotent: every row is upserted on a stable unique key so the script
 * is safe to re-run without duplicating. Permission keys are restricted to
 * the live catalogue in src/routes/staff-access.ts (PERMISSION_CATALOGUE).
 *
 * Run from backend/:  npx tsx prisma/seed-professional.ts
 * (or: npx ts-node prisma/seed-professional.ts)
 */
import prisma from '../src/db';

// Real keys from PERMISSION_CATALOGUE (kept in sync manually; only include
// keys that actually exist in the running catalogue).
const K = {
  profileView: 'profile.view',
  profileEdit: 'profile.edit',
  publicationsViewOwn: 'publications.view_own',
  publicationsUpdateOwn: 'publications.update_own',
  publicationsView: 'publications.view',
  publicationsManage: 'publications.manage',
  publicationsPublish: 'publications.publish',
  servicesView: 'services.view',
  servicesManage: 'services.manage',
  productsView: 'products.view',
  productsViewAssigned: 'products.view_assigned',
  productsUpdateAssigned: 'products.update_assigned',
  productsManage: 'products.manage',
  pricingView: 'pricing.view',
  pricingManage: 'pricing.manage',
  bookingsView: 'bookings.view',
  bookingsViewAssigned: 'bookings.view_assigned',
  bookingsUpdateAssigned: 'bookings.update_assigned',
  bookingsAddProgress: 'bookings.add_progress',
  bookingsMessageCustomer: 'bookings.message_customer',
  bookingsManage: 'bookings.manage',
  enquiriesView: 'enquiries.view',
  enquiriesViewAssigned: 'enquiries.view_assigned',
  enquiriesRespond: 'enquiries.respond',
  enquiriesClose: 'enquiries.close',
  enquiriesManage: 'enquiries.manage',
  reviewsView: 'reviews.view',
  reviewsManage: 'reviews.manage',
  mediaView: 'media.view',
  mediaUpload: 'media.upload',
  mediaManage: 'media.manage',
  pageContentView: 'page_content.view',
  pageContentManage: 'page_content.manage',
  projectsView: 'projects.view',
  projectsViewAssigned: 'projects.view_assigned',
  projectsUpdateAssigned: 'projects.update_assigned',
  projectsManage: 'projects.manage',
  analyticsView: 'analytics.view',
  adminSettings: 'administration.settings',
  adminAudit: 'administration.audit',
  adminRoles: 'administration.roles',
  staffView: 'staff.view',
} as const;

const DEPARTMENTS = [
  {
    key: 'SOFTWARE_ENGINEERING',
    name: 'Software Engineering',
    description:
      'Designs, builds and maintains custom software: mobile (Flutter/Kotlin), web apps, APIs and internal tooling.',
  },
  {
    key: 'DESIGN_CREATIVE',
    name: 'Design & Creative',
    description:
      'UI/UX design, branding, graphic and visual content production for products and marketing.',
  },
  {
    key: 'DATA_ANALYTICS',
    name: 'Data & Analytics',
    description:
      'Python/Excel dashboards, reporting and data analysis services for clients.',
  },
  {
    key: 'CONTENT_COMMS',
    name: 'Content & Communications',
    description:
      'Technical writing, publications, documentation and brand communications.',
  },
  {
    key: 'CLIENT_OPS',
    name: 'Client Operations & Support',
    description:
      'Booking coordination, enquiry handling, customer messaging and delivery support.',
  },
];

const SENIORITY = ['Junior', 'Mid', 'Senior', 'Lead'];

// Positions keyed by department key, with real catalogue permission keys.
const POSITIONS: Record<string, Array<{ title: string; displayTitleTemplate: string; keys: string[] }>> = {
  SOFTWARE_ENGINEERING: [
    {
      title: 'Founder & Lead Software Developer',
      displayTitleTemplate: 'Founder & {seniority} Software Developer',
      keys: [
        K.profileEdit, K.productsView, K.productsManage, K.productsUpdateAssigned,
        K.projectsView, K.projectsManage, K.projectsUpdateAssigned,
        K.servicesView, K.servicesManage, K.pricingView, K.pricingManage,
        K.publicationsView, K.publicationsManage, K.publicationsPublish,
        K.bookingsView, K.bookingsManage, K.enquiriesView, K.enquiriesManage,
        K.reviewsView, K.mediaView, K.mediaManage, K.analyticsView,
        K.pageContentView, K.pageContentManage, K.staffView, K.adminSettings,
        K.adminRoles, K.adminAudit,
      ],
    },
    {
      title: 'Flutter / Mobile Developer',
      displayTitleTemplate: '{seniority} Flutter Developer',
      keys: [K.profileEdit, K.productsViewAssigned, K.productsUpdateAssigned, K.projectsViewAssigned, K.projectsUpdateAssigned, K.publicationsUpdateOwn, K.mediaUpload],
    },
    {
      title: 'Full-Stack Developer',
      displayTitleTemplate: '{seniority} Full-Stack Developer',
      keys: [K.profileEdit, K.servicesView, K.productsViewAssigned, K.productsUpdateAssigned, K.projectsViewAssigned, K.projectsUpdateAssigned, K.publicationsUpdateOwn, K.mediaUpload],
    },
    {
      title: 'Backend / Database Developer',
      displayTitleTemplate: '{seniority} Backend Developer',
      keys: [K.profileEdit, K.servicesView, K.projectsViewAssigned, K.projectsUpdateAssigned, K.publicationsUpdateOwn],
    },
  ],
  DESIGN_CREATIVE: [
    {
      title: 'UI/UX Designer',
      displayTitleTemplate: '{seniority} UI/UX Designer',
      keys: [K.profileEdit, K.publicationsUpdateOwn, K.mediaUpload, K.mediaView],
    },
    {
      title: 'Graphic Designer',
      displayTitleTemplate: '{seniority} Graphic Designer',
      keys: [K.profileEdit, K.publicationsUpdateOwn, K.mediaUpload, K.mediaView],
    },
  ],
  DATA_ANALYTICS: [
    {
      title: 'Data Analyst',
      displayTitleTemplate: '{seniority} Data Analyst',
      keys: [K.profileEdit, K.publicationsUpdateOwn, K.analyticsView, K.mediaUpload],
    },
  ],
  CONTENT_COMMS: [
    {
      title: 'Content Contributor',
      displayTitleTemplate: 'Content Contributor',
      keys: [K.profileEdit, K.publicationsViewOwn, K.publicationsUpdateOwn, K.publicationsView, K.mediaUpload],
    },
    {
      title: 'Content & Communications Officer',
      displayTitleTemplate: 'Content & Communications Officer',
      keys: [K.profileEdit, K.publicationsView, K.publicationsManage, K.publicationsPublish, K.mediaUpload, K.mediaManage, K.pageContentView],
    },
  ],
  CLIENT_OPS: [
    {
      title: 'Support Specialist',
      displayTitleTemplate: 'Support Specialist',
      keys: [K.profileEdit, K.bookingsViewAssigned, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesViewAssigned, K.enquiriesRespond, K.enquiriesClose],
    },
    {
      title: 'Client Operations Coordinator',
      displayTitleTemplate: 'Client Operations Coordinator',
      keys: [K.profileEdit, K.bookingsView, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesView, K.enquiriesManage, K.enquiriesRespond],
    },
  ],
};

const PRESETS = [
  {
    key: 'developer',
    name: 'Developer',
    description: 'Builds and contributes to assigned products, projects and technical publications.',
    keys: [K.profileEdit, K.productsViewAssigned, K.productsUpdateAssigned, K.projectsViewAssigned, K.projectsUpdateAssigned, K.servicesView, K.publicationsUpdateOwn, K.mediaUpload],
  },
  {
    key: 'designer',
    name: 'Designer',
    description: 'Produces visual content and contributes publications.',
    keys: [K.profileEdit, K.publicationsUpdateOwn, K.mediaUpload, K.mediaView],
  },
  {
    key: 'content',
    name: 'Content Contributor',
    description: 'Authors publications and uploads media for review.',
    keys: [K.profileEdit, K.publicationsViewOwn, K.publicationsUpdateOwn, K.publicationsView, K.mediaUpload],
  },
  {
    key: 'coordinator',
    name: 'Coordinator',
    description: 'Coordinates bookings and enquiries across the client lifecycle.',
    keys: [K.profileEdit, K.bookingsView, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesView, K.enquiriesRespond, K.enquiriesClose],
  },
  {
    key: 'support',
    name: 'Support',
    description: 'Handles assigned bookings and enquiries with customer contact.',
    keys: [K.profileEdit, K.bookingsViewAssigned, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesViewAssigned, K.enquiriesRespond, K.enquiriesClose],
  },
];

async function main() {
  let depCount = 0;
  let posCount = 0;
  let presetCount = 0;

  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { key: d.key },
      update: { name: d.name, description: d.description },
      create: { key: d.key, name: d.name, description: d.description },
    });
    depCount++;
  }

  for (const [deptKey, positions] of Object.entries(POSITIONS)) {
    const dept = await prisma.department.findUnique({ where: { key: deptKey } });
    if (!dept) {
      console.warn(`Skipping positions for unknown department ${deptKey}`);
      continue;
    }
    for (const p of positions) {
      await prisma.position.upsert({
        where: { departmentId_title: { departmentId: dept.id, title: p.title } },
        update: {
          displayTitleTemplate: p.displayTitleTemplate,
          defaultPermissionKeys: p.keys,
          seniorityLevels: SENIORITY,
        },
        create: {
          departmentId: dept.id,
          title: p.title,
          displayTitleTemplate: p.displayTitleTemplate,
          defaultPermissionKeys: p.keys,
          seniorityLevels: SENIORITY,
        },
      });
      posCount++;
    }
  }

  for (const p of PRESETS) {
    await prisma.permissionPreset.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, permissionKeys: p.keys },
      create: { key: p.key, name: p.name, description: p.description, permissionKeys: p.keys },
    });
    presetCount++;
  }

  console.log('Seed complete:');
  console.log(`  Departments: ${depCount}`);
  console.log(`  Positions:   ${posCount}`);
  console.log(`  Presets:     ${presetCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
