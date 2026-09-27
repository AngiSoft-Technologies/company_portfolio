import 'dotenv/config';
import { Client } from 'pg';

const covers = new Map([
  ['building-a-local-dev-stack-you-keep', '/uploads/public/images/cms/setting-site_hero-value-slides-1-image-ef04f24e3d.jpg'],
  ['hiring-junior-flutter-developer', '/uploads/public/images/developer-8829735_1280.jpg'],
  ['local-stack-3-commands', '/uploads/public/images/cms/setting-site_hero-value-slides-2-image-d38cea0e91.jpg'],
  ['daily-backup-bash-snippet', '/uploads/public/images/cms/setting-site_hero-value-slides-3-image-492996b936.jpg'],
  ['kejalink-onboarding-guide', '/uploads/public/images/services/realestate-bg.jpg'],
  ['angitunes-offline-playlist-podcast', '/uploads/public/images/services/ai-automation.jpg'],
  ['learning-launch-livestream', '/uploads/public/images/cms/setting-site_hero-value-slides-5-image-b4a4625a97.jpg'],
  ['why-beginner-developers-must-learn-git-and-github', '/uploads/public/images/cms/blogPost-b112e047-b390-4286-8c5d-6d5683d38786-coverImage-d6a88429e3.jpg'],
  ['complete-beginner-roadmap-mobile-app-development-2026', '/uploads/public/images/cms/setting-site_hero-value-slides-2-image-d38cea0e91.jpg'],
  ['how-i-started-programming-with-almost-nothing', '/uploads/public/images/cms/setting-site_hero-value-slides-3-image-492996b936.jpg'],
]);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
for (const [slug, coverImage] of covers) {
  await client.query(
    'UPDATE "BlogPost" SET "coverImage" = $1, "updatedAt" = now() WHERE "slug" = $2',
    [coverImage, slug],
  );
}
await client.end();
console.log(`Seeded ${covers.size} blog cover images.`);
