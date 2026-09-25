#!/usr/bin/env node
/**
 * Migrate local uploads to object storage (Tigris/S3/R2).
 *
 * Walks `backend/uploads/public/**` and uploads every file to the configured
 * bucket with:
 *   - key            `public/<relative path>`  (mirrors the public URL path)
 *   - ContentType    derived from the extension
 *   - CacheControl   `public, max-age=31536000, immutable` (edge/browser cache)
 *
 * Idempotent: PutObject overwrites, so re-running after a partial failure
 * safely resumes. Run from `backend/`:
 *
 *   node scripts/migrate-uploads-to-tigris.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const ROOT = path.resolve(process.cwd(), 'uploads');
const CONCURRENCY = 8;
const RETRIES = 3;

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
};

const env = (key) => process.env[key] || '';
const endpoint = env('S3_ENDPOINT') || env('AWS_ENDPOINT_URL_S3') || env('S3_S3_R2_ENDPOINT') || env('S3_R2_ENDPOINT');
const bucket = env('S3_BUCKET') || env('BUCKET_NAME');
const rawForce = env('S3_FORCE_PATH_STYLE').toLowerCase();
const forcePathStyle = rawForce ? rawForce === '1' || rawForce === 'true' || rawForce === 'yes' : !!endpoint;

if (!bucket) {
  console.error('S3_BUCKET (or BUCKET_NAME) is not set — check backend/.env');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: endpoint || undefined,
  region: env('S3_REGION') || env('AWS_REGION') || 'auto',
  credentials: {
    accessKeyId: env('S3_ACCESS_KEY') || env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('S3_SECRET_KEY') || env('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle,
});

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function uploadOne(full, attempt = 1) {
  const rel = path.relative(ROOT, full).split(path.sep).join('/');
  const ext = path.extname(full).toLowerCase();
  const body = fs.readFileSync(full);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: rel,
    Body: body,
    ContentType: MIME[ext] ?? 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  });
  try {
    await s3.send(command);
    return { rel, ok: true };
  } catch (err) {
    if (attempt < RETRIES) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
      return uploadOne(full, attempt + 1);
    }
    return { rel, ok: false, error: err.message };
  }
}

async function run() {
  const files = walk(ROOT);
  console.log(`bucket: ${bucket}  endpoint: ${endpoint || '(default s3)'}`);
  console.log(`migrating ${files.length} files from ${ROOT} → key prefix "<rel>"`);

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++];
      results.push(await uploadOne(file));
      const done = results.length;
      if (done % 20 === 0 || done === files.length) console.log(`  ${done}/${files.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const failed = results.filter((r) => !r.ok);
  const bytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`uploaded: ${results.length - failed.length}/${files.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  if (failed.length) {
    console.error(`FAILED ${failed.length}:`);
    failed.forEach((f) => console.error(`  ${f.rel} — ${f.error}`));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});