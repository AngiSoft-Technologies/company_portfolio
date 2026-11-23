/**
 * Supported UI locales for both AngiSoft apps (public site + admin).
 *
 * English is the fallback/source locale. Every other dictionary is Partial —
 * any missing key resolves to English, so shipping a translation never breaks
 * the UI. Arabic and Persian set `dir: 'rtl'`; the provider mirrors this onto
 * <html lang/dir> so layout, icons and Intl formatting follow the selection.
 */

export const LOCALES = [
  { code: 'en', label: 'English', native: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili', dir: 'ltr', flag: '🇰🇪' },
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'de', label: 'German', native: 'Deutsch', dir: 'ltr', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', native: 'Português', dir: 'ltr', flag: '🇧🇷' },
  { code: 'it', label: 'Italian', native: 'Italiano', dir: 'ltr', flag: '🇮🇹' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands', dir: 'ltr', flag: '🇳🇱' },
  { code: 'ru', label: 'Russian', native: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  { code: 'uk', label: 'Ukrainian', native: 'Українська', dir: 'ltr', flag: '🇺🇦' },
  { code: 'pl', label: 'Polish', native: 'Polski', dir: 'ltr', flag: '🇵🇱' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'fa', label: 'Persian', native: 'فارسی', dir: 'rtl', flag: '🇮🇷' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'ja', label: 'Japanese', native: '日本語', dir: 'ltr', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', native: '한국어', dir: 'ltr', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', native: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', dir: 'ltr', flag: '🇮🇩' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', dir: 'ltr', flag: '🇻🇳' },
  { code: 'th', label: 'Thai', native: 'ไทย', dir: 'ltr', flag: '🇹🇭' },
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
