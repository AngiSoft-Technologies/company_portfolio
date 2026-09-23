// Correct product logoUrl values to match the real files already uploaded in
// uploads/public/images/Logos/. The DB had capitalized names (PetroFlow.png)
// while the actual files are lowercase-with-"-logo" (petroflow-logo.png),
// causing 404s on the public Products page.
import dbmod from '../src/db';

const prisma: any = dbmod;

const MAP: Record<string, string> = {
  'PetroFlow': '/uploads/public/images/Logos/petroflow-logo.png',
  'DukaFlow': '/uploads/public/images/Logos/duka-flow-logo.png',
  'KejaLink': '/uploads/public/images/Logos/keja-link-logo.png',
  'AngiTunes': '/uploads/public/images/Logos/angitunes-logo.png',
};

async function main() {
  const products = await prisma.product.findMany();
  for (const p of products) {
    const url = MAP[p.name];
    if (url && p.logoUrl !== url) {
      await prisma.product.update({ where: { id: p.id }, data: { logoUrl: url } });
      console.log('fixed', p.name, '->', url);
    }
  }
  console.log('done');
}

main();
