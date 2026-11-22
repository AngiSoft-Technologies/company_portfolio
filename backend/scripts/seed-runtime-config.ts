/**
 * Seed the runtime config vault from backend/.env.
 *
 * - Existing env values are encrypted into `Setting['secret:<KEY>']` rows.
 * - Missing secrets get an encrypted "__SET_IN_ADMIN__" marker (treated as
 *   unset at runtime, visible as "Not set" in the SUPER_ADMIN UI).
 * - Plain settings are stored as-is, falling back to their code default or
 *   the same marker.
 *
 * Never prints values. Run from backend/: `npm run config:seed [-- --force]`.
 */
import 'dotenv/config';
import prisma from '../src/db';
import { ts } from '../src/prisma/db';
import { encryptSecret } from '../src/shared/services/secrets';
import {
  CONFIG_REGISTRY,
  PLACEHOLDER_SECRET,
  asSettingValue,
} from '../src/shared/services/runtimeConfig';

async function main() {
  const force = process.argv.includes('--force');
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    for (const definition of CONFIG_REGISTRY) {
      const fromEnv = Boolean((process.env[definition.key] || '').trim());
      console.log(`dry-run ${definition.kind} ${definition.key} ${fromEnv ? 'from-env' : 'placeholder'}`);
    }
    console.log(`Dry run complete: ${CONFIG_REGISTRY.length} keys (no values shown, no writes).`);
    return;
  }
  let inserted = 0;
  let kept = 0;
  let overwritten = 0;

  for (const definition of CONFIG_REGISTRY) {
    const storageKey = `${definition.kind === 'secret' ? 'secret' : 'config'}:${definition.key}`;
    const existing = await prisma.orm.public.Setting.where({ key: storageKey }).first();
    if (existing && !force) {
      kept += 1;
      continue;
    }

    const envValue = (process.env[definition.key] || '').trim();
    const value =
      envValue ||
      (definition.kind === 'secret' ? PLACEHOLDER_SECRET : definition.defaultValue || PLACEHOLDER_SECRET);
    const storedValue: unknown =
      definition.kind === 'secret' ? encryptSecret(value) : value;

    if (existing) {
      await prisma.orm.public.Setting.where({ key: storageKey }).update({ value: asSettingValue(storedValue) });
      overwritten += 1;
    } else {
      await prisma.orm.public.Setting.create({ key: storageKey, value: asSettingValue(storedValue), updatedAt: ts() });
      inserted += 1;
    }
    console.log(`${force ? 'seeded' : 'inserted'} ${definition.kind} ${definition.key}`);
  }

  console.log(
    `Runtime config seed complete: ${inserted} inserted, ${overwritten} overwritten, ${kept} kept.`
  );
}

main()
  .catch((err) => {
    console.error('Runtime config seed failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.close().catch(() => undefined);
  });
