/**
 * Seeds the professional-identity + permission infrastructure:
 *   Department, Position, PermissionPreset
 *
 * Idempotent: every row is upserted on a stable unique key so the script
 * is safe to re-run without duplicating. Permission keys are derived from
 * PERMISSIONS in src/modules/identity/services/permissionRegistry.ts.
 *
 * Run from backend/:  npx tsx prisma/seed-professional.ts
 * (or: npx ts-node prisma/seed-professional.ts)
 */
import prisma from '../src/db';
import { ts, newId } from '../src/prisma/db';
import { PERMISSIONS } from '../src/modules/identity/services/permissionRegistry';

/**
 * Derived key aliases — no hand-maintained vocabulary in this seed.
 * `K.servicesUpdate` etc. are generated from the canonical PERMISSIONS list,
 * so renamed keys need no edits here. Duplicate aliases are deduped below.
 */
type PermissionKey = (typeof PERMISSIONS)[number]['key'];
type UpperFirst<S extends string> = S extends `${infer C}${infer Rest}` ? `${Uppercase<C>}${Rest}` : S;
type CamelPermissionKey<S extends string> =
  S extends `${infer Head}.${infer Tail}` ? `${Head}${UpperFirst<CamelPermissionKey<Tail>>}` :
  S extends `${infer Head}_${infer Tail}` ? `${Head}${UpperFirst<CamelPermissionKey<Tail>>}` :
  S;
type PermissionAliases = { [P in PermissionKey as CamelPermissionKey<P>]: P };

const camelPermissionKey = (key: string): string =>
  key.replace(/[._]([a-zA-Z0-9])/g, (_match, c: string) => c.toUpperCase());

const K = Object.fromEntries(
  PERMISSIONS.map((p) => [camelPermissionKey(p.key), p.key]),
) as PermissionAliases;

/** Several legacy aliases now point at the same canonical key; store it once. */
const uniqueKeys = (keys: readonly string[]): string[] => [...new Set(keys)];

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
        K.profileUpdateOwn, K.productsView, K.productsUpdate, K.productsUpdateAssigned,
        K.projectsView, K.projectsManage, K.projectsUpdateAssigned,
        K.servicesView, K.servicesUpdate, K.servicesManagePricing, K.servicesManagePricing,
        K.publicationsReview, K.publicationsPublish, K.publicationsPublish,
        K.bookingsViewAll, K.bookingsAssign, K.enquiriesViewAll, K.enquiriesClose,
        K.reviewsModerate, K.mediaUpload, K.mediaManage, K.analyticsView,
        K.pagesUpdateHome, K.pagesUpdateHome, K.staffView, K.administrationSettings,
        K.administrationRoles, K.administrationAudit,
      ],
    },
    {
      title: 'Flutter / Mobile Developer',
      displayTitleTemplate: '{seniority} Flutter Developer',
      keys: [K.profileUpdateOwn, K.productsViewAssigned, K.productsUpdateAssigned, K.projectsViewAssigned, K.projectsUpdateAssigned, K.publicationsUpdateOwn, K.mediaUpload],
    },
    {
      title: 'Full-Stack Developer',
      displayTitleTemplate: '{seniority} Full-Stack Developer',
      keys: [K.profileUpdateOwn, K.servicesView, K.productsViewAssigned, K.productsUpdateAssigned, K.projectsViewAssigned, K.projectsUpdateAssigned, K.publicationsUpdateOwn, K.mediaUpload],
    },
    {
      title: 'Backend / Database Developer',
      displayTitleTemplate: '{seniority} Backend Developer',
      keys: [K.profileUpdateOwn, K.servicesView, K.projectsViewAssigned, K.projectsUpdateAssigned, K.publicationsUpdateOwn],
    },
  ],
  DESIGN_CREATIVE: [
    {
      title: 'UI/UX Designer',
      displayTitleTemplate: '{seniority} UI/UX Designer',
      keys: [K.profileUpdateOwn, K.publicationsUpdateOwn, K.mediaUpload, K.mediaUpload],
    },
    {
      title: 'Graphic Designer',
      displayTitleTemplate: '{seniority} Graphic Designer',
      keys: [K.profileUpdateOwn, K.publicationsUpdateOwn, K.mediaUpload, K.mediaUpload],
    },
  ],
  DATA_ANALYTICS: [
    {
      title: 'Data Analyst',
      displayTitleTemplate: '{seniority} Data Analyst',
      keys: [K.profileUpdateOwn, K.publicationsUpdateOwn, K.analyticsView, K.mediaUpload],
    },
  ],
  CONTENT_COMMS: [
    {
      title: 'Content Contributor',
      displayTitleTemplate: 'Content Contributor',
      keys: [K.profileUpdateOwn, K.publicationsViewOwn, K.publicationsUpdateOwn, K.publicationsReview, K.mediaUpload],
    },
    {
      title: 'Content & Communications Officer',
      displayTitleTemplate: 'Content & Communications Officer',
      keys: [K.profileUpdateOwn, K.publicationsReview, K.publicationsPublish, K.publicationsPublish, K.mediaUpload, K.mediaManage, K.pagesUpdateHome],
    },
  ],
  CLIENT_OPS: [
    {
      title: 'Support Specialist',
      displayTitleTemplate: 'Support Specialist',
      keys: [K.profileUpdateOwn, K.bookingsViewAssigned, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesViewAssigned, K.enquiriesRespond, K.enquiriesClose],
    },
    {
      title: 'Client Operations Coordinator',
      displayTitleTemplate: 'Client Operations Coordinator',
      keys: [K.profileUpdateOwn, K.bookingsViewAll, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesViewAll, K.enquiriesClose, K.enquiriesRespond],
    },
  ],
};

const PRESETS = [
  {
    key: 'developer',
    name: 'Developer',
    description: 'Builds and contributes to assigned products, projects and technical publications.',
    keys: [K.profileUpdateOwn, K.productsViewAssigned, K.productsUpdateAssigned, K.projectsViewAssigned, K.projectsUpdateAssigned, K.servicesView, K.publicationsUpdateOwn, K.mediaUpload],
  },
  {
    key: 'designer',
    name: 'Designer',
    description: 'Produces visual content and contributes publications.',
    keys: [K.profileUpdateOwn, K.publicationsUpdateOwn, K.mediaUpload, K.mediaUpload],
  },
  {
    key: 'content',
    name: 'Content Contributor',
    description: 'Authors publications and uploads media for review.',
    keys: [K.profileUpdateOwn, K.publicationsViewOwn, K.publicationsUpdateOwn, K.publicationsReview, K.mediaUpload],
  },
  {
    key: 'coordinator',
    name: 'Coordinator',
    description: 'Coordinates bookings and enquiries across the client lifecycle.',
    keys: [K.profileUpdateOwn, K.bookingsViewAll, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesViewAll, K.enquiriesRespond, K.enquiriesClose],
  },
  {
    key: 'support',
    name: 'Support',
    description: 'Handles assigned bookings and enquiries with customer contact.',
    keys: [K.profileUpdateOwn, K.bookingsViewAssigned, K.bookingsUpdateAssigned, K.bookingsMessageCustomer, K.enquiriesViewAssigned, K.enquiriesRespond, K.enquiriesClose],
  },
];

async function main() {
  let depCount = 0;
  let posCount = 0;
  let presetCount = 0;

  for (const d of DEPARTMENTS) {
    await prisma.transaction(async (tx) => {
      const existing = await tx.orm.public.Department.where({ key: d.key }).first();
      if (existing) {
        await tx.orm.public.Department.where({ key: d.key }).update({
          name: d.name,
          description: d.description,
          updatedAt: ts(),
        });
      } else {
        await tx.orm.public.Department.create({
          id: newId(),
          key: d.key,
          name: d.name,
          description: d.description,
          updatedAt: ts(),
        });
      }
    });
    depCount++;
  }

  for (const [deptKey, positions] of Object.entries(POSITIONS)) {
    const dept = await prisma.orm.public.Department.where({ key: deptKey }).first();
    if (!dept) {
      console.warn(`Skipping positions for unknown department ${deptKey}`);
      continue;
    }
    for (const p of positions) {
      await prisma.transaction(async (tx) => {
        const existing = await tx.orm.public.Position
          .where((x) => x.departmentId.eq(dept.id))
          .where((x) => x.title.eq(p.title))
          .first();
        const payload = {
          displayTitleTemplate: p.displayTitleTemplate,
          defaultPermissionKeys: uniqueKeys(p.keys),
          seniorityLevels: SENIORITY,
        };
        if (existing) {
          await tx.orm.public.Position
            .where((x) => x.departmentId.eq(dept.id))
            .where((x) => x.title.eq(p.title))
            .update({ ...payload, updatedAt: ts() });
        } else {
          await tx.orm.public.Position.create({
            id: newId(),
            departmentId: dept.id,
            title: p.title,
            ...payload,
            updatedAt: ts(),
          });
        }
      });
      posCount++;
    }
  }

  for (const p of PRESETS) {
    await prisma.transaction(async (tx) => {
      const existing = await tx.orm.public.PermissionPreset.where({ key: p.key }).first();
      const payload = { name: p.name, description: p.description, permissionKeys: uniqueKeys(p.keys) };
      if (existing) {
        await tx.orm.public.PermissionPreset.where({ key: p.key }).update({ ...payload, updatedAt: ts() });
      } else {
        await tx.orm.public.PermissionPreset.create({
          id: newId(),
          key: p.key,
          ...payload,
          updatedAt: ts(),
        });
      }
    });
    presetCount++;
  }

  console.log('Seed complete:');
  console.log(`  Departments: ${depCount}`);
  console.log(`  Positions:   ${posCount}`);
  console.log(`  Presets:     ${presetCount}`);
}

main()
  .then(() => prisma.close())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.close();
    process.exit(1);
  });
