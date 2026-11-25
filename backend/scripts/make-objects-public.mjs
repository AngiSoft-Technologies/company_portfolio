#!/usr/bin/env node
/**
 * One-off: mark every object under S3_KEY_PREFIX as public-read so the Tigris
 * public CDN can serve them. Tigris requires a per-object ACL; bucket-level
 * "public" does not apply retroactively.
 *
 * Run from backend/:  node scripts/make-objects-public.mjs [prefix]
 */
import 'dotenv/config';
import { S3Client, ListObjectsV2Command, PutObjectAclCommand } from '@aws-sdk/client-s3';

const env = (k) => process.env[k] || '';
const endpoint = env('S3_ENDPOINT') || env('AWS_ENDPOINT_URL_S3');
const bucket = env('S3_BUCKET') || env('BUCKET_NAME');
const prefix = (process.argv[2] ?? env('S3_KEY_PREFIX')).replace(/^\/+|\/+$/g, '');
const keyPrefix = prefix ? `${prefix}/` : '';

if (!bucket) { console.error('S3_BUCKET not set'); process.exit(1); }

const s3 = new S3Client({
  endpoint: endpoint || undefined,
  region: env('S3_REGION') || env('AWS_REGION') || 'auto',
  credentials: {
    accessKeyId: env('S3_ACCESS_KEY') || env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('S3_SECRET_KEY') || env('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: true,
});

const keys = [];
let token;
do {
  const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: keyPrefix, ContinuationToken: token }));
  for (const o of out.Contents ?? []) if (o.Key && !o.Key.endsWith('/')) keys.push(o.Key);
  token = out.IsTruncated ? out.NextContinuationToken : undefined;
} while (token);

console.log(`${keys.length} objects under "${keyPrefix}" in ${bucket}`);
let done = 0, failed = 0;
const CONCURRENCY = 16;
let cursor = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (cursor < keys.length) {
    const key = keys[cursor++];
    try {
      await s3.send(new PutObjectAclCommand({ Bucket: bucket, Key: key, ACL: 'public-read' }));
    } catch (e) {
      failed++;
      console.error(`FAIL ${key}: ${e.message}`);
    }
    if (++done % 50 === 0 || done === keys.length) console.log(`  ${done}/${keys.length}`);
  }
}));
console.log(`done: ${done - failed} ok, ${failed} failed`);
process.exit(failed ? 1 : 0);
