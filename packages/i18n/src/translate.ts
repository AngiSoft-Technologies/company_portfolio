import { dictionaries, type Dictionary, type TranslationKey } from './dictionaries';

/** Interpolate `{{name}}` placeholders with a safe string value. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * Resolve a key for a locale. Never throws: missing keys fall back to English,
 * and a missing English key returns the key itself so the UI stays readable.
 */
export function translate(
  locale: string,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const pick = (dict: Dictionary | undefined) => dict?.[key];
  const primary = pick(dictionaries[locale as keyof typeof dictionaries]);
  const resolved = primary ?? pick(dictionaries.en) ?? String(key);
  return interpolate(resolved, vars);
}
