// Extracts `defaultAbout`, `ABOUT_SECTION_KEYS`, and `ABOUT_SCHEMA_VERSION`
// from the frontend hook source WITHOUT executing React imports.
// Writes backend/prisma/about-default-data.ts that seed.ts imports.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hookPath = join(
  __dirname,
  '..',
  '..',
  'frontend',
  'src',
  'hooks',
  'useAboutPage.js'
);
const outPath = join(__dirname, '..', 'prisma', 'about-default-data.ts');

const source = readFileSync(hookPath, 'utf8');

// Grab only the three declarations we need by source slicing.
const schemaVersion = source.match(
  /export const ABOUT_SCHEMA_VERSION = (\d+);/
)?.[1];

const sectionKeysMatch = source.match(
  /export const ABOUT_SECTION_KEYS = (\[[\s\S]*?\n\];)/
);
const defaultAboutMatch = source.match(
  /export const defaultAbout = (\{[\s\S]*?\n\};)/
);

if (!schemaVersion || !sectionKeysMatch || !defaultAboutMatch) {
  throw new Error('Could not locate defaultAbout / keys / version in hook source');
}

// Write a plain TS module (no React)
const out = `// AUTO-GENERATED from frontend/src/hooks/useAboutPage.js (defaultAbout).
// Regenerate with: npm run extract:about-default
// Source of truth = the frontend About-page contract. Do NOT edit by hand.

export const ABOUT_SCHEMA_VERSION = ${schemaVersion};

export const ABOUT_SECTION_KEYS = ${sectionKeysMatch[1]}

export const defaultAbout = ${defaultAboutMatch[1]}
`;

writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath);
