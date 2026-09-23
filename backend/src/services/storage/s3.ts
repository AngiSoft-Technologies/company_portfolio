import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Single S3-compatible object-storage client.
 *
 * Works with any S3-compatible endpoint: Tigris (https://t3.storage.dev),
 * Cloudflare R2, AWS S3, MinIO, DigitalOcean Spaces. Configuration is
 * entirely environment-driven so switching buckets never requires a deploy:
 *
 *   S3_ENDPOINT            endpoint URL (e.g. https://t3.storage.dev)
 *   AWS_ENDPOINT_URL_S3    alternative endpoint name (what `fly storage create` sets)
 *   S3_REGION / AWS_REGION default 'auto'
 *   S3_ACCESS_KEY / AWS_ACCESS_KEY_ID       key id (Tigris: tid_...)
 *   S3_SECRET_KEY / AWS_SECRET_ACCESS_KEY   secret (Tigris: tsec_...)
 *   S3_BUCKET / BUCKET_NAME bucket name
 *   S3_FORCE_PATH_STYLE    '1'/'true' forces path-style addressing; default is
 *                          enabled for custom endpoints (safe for AWS/R2/Tigris),
 *                          0 disables (virtual-hosted style).
 *   S3_PUBLIC_BASE_URL     public CDN base for public objects (Tigris bucket CDN
 *                          host). Optional — when unset and the bucket was created
 *                          via `fly storage create`, it defaults to
 *                          https://<bucket>.t3.tigrisfiles.io.
 *
 * The S3_* names are the canonical ones; the AWS_* equivalents exist so the app
 * runs unchanged against Fly.io's `fly storage create`, which sets exactly those
 * AWS_* secrets (plus BUCKET_NAME) on the app.
 *
 * Env is read lazily (inside the call tree) so dotenv has already configured
 * process.env before the first request, regardless of import order.
 */

const env = (key: string) => process.env[key] || '';

function endpointUrl() {
    return env('S3_ENDPOINT') || env('AWS_ENDPOINT_URL_S3') || env('S3_S3_R2_ENDPOINT') || env('S3_R2_ENDPOINT');
}

function accessKeyId() {
    return env('S3_ACCESS_KEY') || env('AWS_ACCESS_KEY_ID');
}

function secretAccessKey() {
    return env('S3_SECRET_KEY') || env('AWS_SECRET_ACCESS_KEY');
}

function bucketName() {
    return env('S3_BUCKET') || env('BUCKET_NAME');
}

function region() {
    return env('S3_REGION') || env('AWS_REGION') || 'auto';
}

function isTigrisEndpoint(endpoint: string): boolean {
    return /tigris\.|t3\.|storage\.dev/i.test(endpoint);
}

function isConfigured() {
    const endpoint = endpointUrl();
    const accessKey = accessKeyId();
    const secretKey = secretAccessKey();
    const bucket = bucketName();
    return Boolean(endpoint && accessKey && secretKey && bucket);
}

function resolveForcePathStyle() {
    const raw = env('S3_FORCE_PATH_STYLE').toLowerCase();
    if (raw) {
        return raw === '1' || raw === 'true' || raw === 'yes';
    }
    return !!endpointUrl();
}

function client() {
    const endpoint = endpointUrl();
    const accessKey = accessKeyId();
    const secretKey = secretAccessKey();
    return new S3Client({
        endpoint: endpoint || undefined,
        region: region(),
        credentials: accessKey && secretKey ? { accessKeyId: accessKey, secretAccessKey: secretKey } : undefined,
        forcePathStyle: resolveForcePathStyle()
    });
}

/** True when every credential required to talk to the bucket is present. */
export function isS3Enabled() {
    return isConfigured();
}

export function getBucket() {
    return bucketName();
}

/** Public CDN base for public objects (explicit config, else Tigris bucket CDN). */
function publicBaseUrl(): string {
    const explicit = env('S3_PUBLIC_BASE_URL');
    if (explicit) return explicit.replace(/\/+$/g, '');
    const endpoint = endpointUrl();
    const bucket = bucketName();
    if (endpoint && bucket && isTigrisEndpoint(endpoint)) {
        return `https://${bucket}.t3.tigrisfiles.io`;
    }
    return '';
}

/** Public CDN URL for a key, or the raw key path when no public base resolves. */
export function toPublicUrl(key: string) {
    const base = publicBaseUrl();
    if (!base) return `/${key.replace(/^\/+/, '')}`;
    return `${base}/${key.replace(/^\/+/, '')}`;
}

export async function generatePresignedPutUrl(key: string, contentType = 'application/octet-stream', expiresSeconds = 900) {
    const cmd = new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentType: contentType });
    return getSignedUrl(client(), cmd, { expiresIn: expiresSeconds });
}

/** Upload a buffer/stream straight to the bucket (used by multer memory uploads). */
export async function uploadObject(opts: { key: string; body: Buffer | Uint8Array | string; contentType: string; publicRead?: boolean }) {
    if (!isConfigured()) throw new Error('S3 storage is not configured');
    const cmd = new PutObjectCommand({
        Bucket: getBucket(),
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
        ...(opts.publicRead ? { CacheControl: 'public, max-age=31536000, immutable' } : {})
    });
    await client().send(cmd);
    return opts.key;
}

/** Fetch an object; the caller pipes `Body` (a readable stream) to the response. */
export async function getObject(key: string) {
    if (!isConfigured()) throw new Error('S3 storage is not configured');
    const cmd = new GetObjectCommand({ Bucket: getBucket(), Key: key });
    return client().send(cmd);
}

export async function deleteObject(key: string) {
    if (!isConfigured()) throw new Error('S3 storage is not configured');
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
    return key;
}