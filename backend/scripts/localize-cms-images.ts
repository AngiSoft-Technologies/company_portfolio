import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const outputRoot = path.resolve(process.cwd(), 'uploads/public/images/cms');
const publicRoot = '/uploads/public/images/cms';
const remoteImagePattern = /^https?:\/\//i;
const imageKeyPattern = /(image|images|avatar|logo|banner|background|poster|thumbnail|cover|screenshot|icon)/i;
const skipUrlKeyPattern = /(website|linkedin|twitter|github|facebook|projectUrl|repoUrl|demoUrl|portfolioUrl|cvUrl|videoUrl|url)$/i;

const scalarTargets = [
  { model: 'employee', fields: ['avatarUrl'] },
  { model: 'employeePortfolioItem', fields: ['imageUrl'] },
  { model: 'client', fields: ['avatarUrl'] },
  { model: 'service', fields: ['images'] },
  { model: 'project', fields: ['images'] },
  { model: 'blogPost', fields: ['coverImage'] },
  { model: 'testimonial', fields: ['imageUrl'] },
  { model: 'product', fields: ['logoUrl', 'bannerUrl', 'screenshots'] },
  { model: 'staffBlog', fields: ['coverImage'] },
  { model: 'companyStat', fields: ['icon'] },
];

function isRemoteUrl(value: unknown): value is string {
  return typeof value === 'string' && remoteImagePattern.test(value);
}

function shouldLocalizeKey(key: string) {
  return imageKeyPattern.test(key) && !skipUrlKeyPattern.test(key);
}

function extensionFrom(contentType: string | null, url: string) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) return ext;
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('gif')) return '.gif';
  if (contentType?.includes('svg')) return '.svg';
  return '.jpg';
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'image';
}

function localName(source: string, model: string, recordId: string, fieldPath: string, contentType: string | null) {
  const hash = crypto.createHash('sha1').update(source).digest('hex').slice(0, 10);
  const ext = extensionFrom(contentType, source);
  return `${safeName(model)}-${safeName(recordId)}-${safeName(fieldPath)}-${hash}${ext}`;
}

async function downloadImage(url: string, model: string, recordId: string, fieldPath: string) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'AngiSoft-CMS-Image-Localizer/1.0' },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type');
  if (!contentType?.startsWith('image/')) throw new Error(`Not an image: ${contentType || 'unknown content-type'}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = localName(url, model, recordId, fieldPath, contentType);
  const diskPath = path.join(outputRoot, fileName);
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(diskPath, buffer);
  return `${publicRoot}/${fileName}`;
}

type Replacement = {
  path: string;
  from: string;
  to?: string;
  error?: string;
};

async function replaceRemoteString(value: string, model: string, recordId: string, fieldPath: string, replacements: Replacement[]) {
  if (!isRemoteUrl(value)) return value;

  const replacement: Replacement = { path: fieldPath, from: value };
  replacements.push(replacement);

  if (!apply) return value;

  try {
    replacement.to = await downloadImage(value, model, recordId, fieldPath);
    return replacement.to;
  } catch (err: any) {
    replacement.error = err.message || 'Download failed';
    return value;
  }
}

async function localizeValue(value: any, model: string, recordId: string, fieldPath: string, replacements: Replacement[], keyHint?: string): Promise<any> {
  if (Array.isArray(value)) {
    const next = [];
    for (let index = 0; index < value.length; index += 1) {
      next.push(await localizeValue(value[index], model, recordId, `${fieldPath}.${index}`, replacements, keyHint));
    }
    return next;
  }

  if (value && typeof value === 'object') {
    const next: Record<string, any> = Array.isArray(value) ? [] : {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const nestedPath = fieldPath ? `${fieldPath}.${key}` : key;
      if (typeof nestedValue === 'string' && shouldLocalizeKey(key)) {
        next[key] = await replaceRemoteString(nestedValue, model, recordId, nestedPath, replacements);
      } else {
        next[key] = await localizeValue(nestedValue, model, recordId, nestedPath, replacements, key);
      }
    }
    return next;
  }

  if (typeof value === 'string' && keyHint && shouldLocalizeKey(keyHint)) {
    return replaceRemoteString(value, model, recordId, fieldPath, replacements);
  }

  return value;
}

async function processScalarModel(target: { model: string; fields: string[] }) {
  const delegate = (prisma as any)[target.model];
  if (!delegate) return;

  const rows = await delegate.findMany({
    select: Object.fromEntries(['id', ...target.fields].map((field) => [field, true])),
  });

  for (const row of rows) {
    const data: Record<string, any> = {};
    const replacements: Replacement[] = [];

    for (const field of target.fields) {
      data[field] = await localizeValue(row[field], target.model, row.id, field, replacements, field);
    }

    if (!replacements.length) continue;
    report(target.model, row.id, replacements);

    if (apply && replacements.some((item) => item.to)) {
      await delegate.update({ where: { id: row.id }, data });
    }
  }
}

async function processSettings() {
  const settings = await prisma.setting.findMany();

  for (const setting of settings) {
    const replacements: Replacement[] = [];
    const value = await localizeValue(setting.value, 'setting', setting.key, 'value', replacements);
    if (!replacements.length) continue;

    report('setting', setting.key, replacements);

    if (apply && replacements.some((item) => item.to)) {
      await prisma.setting.update({ where: { key: setting.key }, data: { value } });
    }
  }
}

function report(model: string, id: string, replacements: Replacement[]) {
  console.log(`\n${model}:${id}`);
  for (const item of replacements) {
    const status = item.error ? `ERROR ${item.error}` : item.to ? `SAVED ${item.to}` : 'DRY-RUN';
    console.log(`  ${status} ${item.path}`);
    console.log(`    ${item.from}`);
  }
}

async function main() {
  console.log(apply ? 'Applying CMS image localization...' : 'Dry run: CMS image localization. Use --apply to download and update DB.');
  await processSettings();
  for (const target of scalarTargets) {
    await processScalarModel(target);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
