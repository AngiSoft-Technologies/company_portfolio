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
 *   S3_KEY_PREFIX          optional key prefix (folder) prepended to every object
 *                          key, e.g. 'company-portfolio' stores objects under
 *                          <prefix>/<key>. Logical keys used across the app stay
 *                          unprefixed; the prefix is applied at the S3 boundary.
 *   S3_FORCE_PATH_STYLE    '1'/'true' forces path-style addressing; default is
 *                          enabled for custom endpoints (safe for AWS/R2/Tigris),
 *                          0 disables (virtual-hosted style).
 *   S3_PUBLIC_BASE_URL     public CDN base for public objects (custom domain,
 *                          e.g. https://cdn1.angisoft.co.ke). Optional — when unset
 *                          and the bucket was created via `fly storage create`, it
 *                          defaults to https://<bucket>.t3.tigrisbucket.io.
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

/** Normalized 'prefix/' (or '' when unset) applied to every object key. */
function keyPrefix() {
    const raw = env('S3_KEY_PREFIX').replace(/^\/+|\/+$/g, '');
    return raw ? `${raw}/` : '';
}

/** Logical app key → actual object key inside the bucket. */
function toObjectKey(key: string) {
    return `${keyPrefix()}${key.replace(/^\/+/, '')}`;
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

/**
 * Tigris buckets serve public objects only when the object carries a
 * public-read ACL (bucket-level "public" alone does not make new uploads
 * readable). Returns the canned ACL to merge into PutObject params, or an
 * empty object for providers where ACLs are unsupported/ignored.
 */
function publicReadAcl() {
    return isTigrisEndpoint(endpointUrl()) ? { ACL: 'public-read' as const } : {};
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
        return `https://${bucket}.t3.tigrisbucket.io`;
    }
    return '';
}

/** Public CDN URL for a key, or the raw key path when no public base resolves. */
export function toPublicUrl(key: string) {
    const base = publicBaseUrl();
    const path = `${keyPrefix()}${key.replace(/^\/+/, '')}`;
    if (!base) return `/${path}`;
    return `${base}/${path}`;
}

const SAFE_KEY_PREFIXES = new Set([
    'public', 'private',
    'booking', 'client_project', 'project_deliverable', 'project_comment',
    'employee', 'employee_document', 'general', 'blog-covers',
]);
const SAFE_KEY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/;
const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/zip',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function assertSafeObjectKey(key: string): void {
    if (typeof key !== 'string' || key.length > 512) throw new Error('Invalid storage key');
    const segments = key.split('/');
    if (segments.length < 2 || segments.length > 5) throw new Error('Invalid storage key');
    if (!SAFE_KEY_PREFIXES.has(segments[0])) throw new Error('Invalid storage key prefix');
    if (segments.some((segment) => !SAFE_KEY_SEGMENT.test(segment) || segment === '.' || segment === '..')) {
        throw new Error('Invalid storage key');
    }
}

function assertAllowedContentType(contentType: string, allowSvg = false): void {
    if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType) && !(allowSvg && contentType === 'image/svg+xml')) {
        throw new Error('Unsupported upload content type');
    }
}

export async function generatePresignedPutUrl(key: string, contentType = 'application/octet-stream', expiresSeconds = 900) {
    assertSafeObjectKey(key);
    assertAllowedContentType(contentType);
    const cmd = new PutObjectCommand({ Bucket: getBucket(), Key: toObjectKey(key), ContentType: contentType, ...publicReadAcl() });
    return getSignedUrl(client(), cmd, { expiresIn: expiresSeconds });
}

export async function generatePresignedGetUrl(key: string, filename = 'download', expiresSeconds = 300) {
    const cmd = new GetObjectCommand({
        Bucket: getBucket(),
        Key: toObjectKey(key),
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`
    });
    return getSignedUrl(client(), cmd, { expiresIn: expiresSeconds });
}

/** Upload a buffer/stream straight to the bucket (used by multer memory uploads). */
export async function uploadObject(opts: { key: string; body: Buffer | Uint8Array | string; contentType: string; publicRead?: boolean }) {
    if (!isConfigured()) throw new Error('S3 storage is not configured');
    assertSafeObjectKey(opts.key);
    // SVG is allowed here only for internally generated, escaped cover art.
    assertAllowedContentType(opts.contentType, opts.key.startsWith('blog-covers/'));
    const cmd = new PutObjectCommand({
        Bucket: getBucket(),
        Key: toObjectKey(opts.key),
        Body: opts.body,
        ContentType: opts.contentType,
        ...(opts.publicRead ? { CacheControl: 'public, max-age=31536000, immutable', ...publicReadAcl() } : {})
    });
    await client().send(cmd);
    return opts.key;
}

/** Fetch an object; the caller pipes `Body` (a readable stream) to the response. */
export async function getObject(key: string) {
    if (!isConfigured()) throw new Error('S3 storage is not configured');
    const cmd = new GetObjectCommand({ Bucket: getBucket(), Key: toObjectKey(key) });
    return client().send(cmd);
}

export async function deleteObject(key: string) {
    if (!isConfigured()) throw new Error('S3 storage is not configured');
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: toObjectKey(key) }));
    return key;
}