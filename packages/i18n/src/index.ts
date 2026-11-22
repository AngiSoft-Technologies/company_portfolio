export { LanguageProvider, useI18n, default } from './LanguageProvider';
export type { I18nContextValue } from './LanguageProvider';
export { LanguageSwitcher } from './LanguageSwitcher';
export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  resolveLocale,
  localeMeta,
  detectLocale,
} from './locales';
export type { LocaleCode, TextDirection } from './locales';
export { translate, interpolate } from './translate';
export { dictionaries } from './dictionaries';
export type { Dictionary, TranslationKey } from './dictionaries';
