#!/usr/bin/env ts-node
/**
 * Sync storage assets into the `File` table.
 *
 * Walks `backend/uploads/public` and upserts a `File` row for every file found
 * there, so the moved marketing/CMS media becomes queryable/CMS-visible from
 * the backend (the static middleware already serves them at /uploads/public/**).
 *
 * Idempotent: each row's `id` is derived deterministically from the public URL
 * (`gen-` + sha1(url)), so re-running updates existing rows instead of
 * duplicating them.
 *
 * Run:  npx ts-node scripts/sync-uploads.ts   (from backend/)
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const ROOT = path.resolve(process.cwd(), 'uploads', 'public');

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function deriveId(url: string): string {
  return 'gen-' + crypto.createHash('sha1').update(url).digest('hex').slice(0, 24);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`Storage root not found: ${ROOT}`);
    process.exit(1);
  }

  const files = walk(ROOT);
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;

  for (const full of files) {
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    const url = '/uploads/public/' + rel;
    const ext = path.extname(full).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    const size = fs.statSync(full).size;
    const id = deriveId(url);

    const data = {
      id,
      ownerType: 'general',
      filename: path.basename(full),
      url,
      mime,
      size,
      metadata: { public: true, path: ['public'] } as any,
    };

    const existing = await prisma.file.findUnique({ where: { id } });
    if (existing) {
      await prisma.file.update({ where: { id }, data });
      updated++;
    } else {
      await prisma.file.create({ data });
      created++;
    }
  }

  await prisma.$disconnect();
  console.log(`sync-uploads complete: ${created} created, ${updated} updated, ${files.length} total`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
