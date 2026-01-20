import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.S3_ENDPOINT || process.env.S3_R2_ENDPOINT || '';
const region = process.env.S3_REGION || 'auto';
const accessKey = process.env.S3_ACCESS_KEY || '';
const secretKey = process.env.S3_SECRET_KEY || '';
const bucket = process.env.S3_BUCKET || '';

const s3 = new S3Client({ endpoint: endpoint || undefined, region, credentials: accessKey && secretKey ? { accessKeyId: accessKey, secretAccessKey: secretKey } : undefined, forcePathStyle: !!endpoint });

export async function generatePresignedPutUrl(key: string, contentType = 'application/octet-stream', expiresSeconds = 900) {
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
    return url;
}
