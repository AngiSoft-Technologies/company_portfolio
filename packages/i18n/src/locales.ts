/**
 * Supported UI locales for both AngiSoft apps (public site + admin).
 *
 * English is the fallback/source locale. Every other dictionary is Partial —
 * any missing key resolves to English, so shipping a translation never breaks
 * the UI. Arabic sets `dir: 'rtl'`; the provider mirrors this onto
 * <html lang/dir> so layout, icons and Intl formatting follow the selection.
 */

export const LOCALES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili', dir: 'ltr', flag: '🇰🇪' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'zh', label: 'Chinese', native: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl', flag: '🇸🇦' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];
export type TextDirection = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: LocaleCode = 'en';
export const LOCALE_STORAGE_KEY = 'angisoft-language';

const LOCALE_MAP = new Map<string, (typeof LOCALES)[number]>(
  LOCALES.map((l) => [l.code, l]),
);

/** Resolve any BCP-47 tag (e.g. `fr-CA`, `sw-KE`, `zh-Hans`) to a supported locale. */
export function resolveLocale(input: unknown): LocaleCode {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return DEFAULT_LOCALE;
  if (LOCALE_MAP.has(raw)) return raw as LocaleCode;
  const base = raw.split(/[-_]/)[0];
  return LOCALE_MAP.has(base) ? (base as LocaleCode) : DEFAULT_LOCALE;
}

export function localeMeta(code: LocaleCode): (typeof LOCALES)[number] {
  return LOCALE_MAP.get(code) ?? LOCALES[0];
}

/** Best-effort locale from the browser/OS, falling back to English. */
export function detectLocale(): LocaleCode {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const candidates = (navigator as Navigator & { languages?: readonly string[] }).languages?.length
    ? (navigator as Navigator & { languages?: readonly string[] }).languages!
    : [navigator.language];
  for (const candidate of candidates) {
    const resolved = resolveLocale(candidate);
    if (resolved !== DEFAULT_LOCALE || String(candidate).toLowerCase().startsWith('en')) {
      return resolved;
    }
  }
  return DEFAULT_LOCALE;
}
