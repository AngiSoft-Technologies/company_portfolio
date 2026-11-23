import type { LocaleCode } from '../locales';
import type { TranslationKey } from './en';
import { en } from './en';

export type Dictionary = Partial<Record<TranslationKey, string>>;

/**
 * English stays in the entry chunk as the synchronous fallback. Other locales
 * are populated by `loadDictionary()` from the code-split `lazy.ts` bundle the
 * first time they are selected. The object shape is stable so existing
 * consumers can keep indexing it.
 */
export const dictionaries: Record<LocaleCode, Dictionary> = {
  en,
  sw: {}, fr: {}, es: {}, de: {}, pt: {}, it: {}, nl: {}, ru: {}, uk: {},
  pl: {}, tr: {}, ar: {}, fa: {}, hi: {}, ja: {}, ko: {}, zh: {}, id: {},
  vi: {}, th: {},
};

let lazyBundle: Promise<{ lazyDictionaries: Partial<Record<LocaleCode, Dictionary>> }> | undefined;

/** Load a locale dictionary on demand. English is already synchronous. */
export async function loadDictionary(locale: LocaleCode): Promise<Dictionary> {
  if (locale === 'en') return en;
  const current = dictionaries[locale];
  if (current && Object.keys(current).length) return current;

  lazyBundle ??= import('./lazy');
  const { lazyDictionaries } = await lazyBundle;
  const dictionary = lazyDictionaries[locale];
  if (dictionary) dictionaries[locale] = dictionary;
  return dictionary ?? {};
}

export { en };
export type { TranslationKey } from './en';
