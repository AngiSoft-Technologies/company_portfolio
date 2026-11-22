import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALES,
  detectLocale,
  localeMeta,
  resolveLocale,
  type LocaleCode,
  type TextDirection,
} from './locales';
import { translate } from './translate';
import type { TranslationKey } from './dictionaries';

export interface I18nContextValue {
  locale: LocaleCode;
  dir: TextDirection;
  label: string;
  native: string;
  locales: typeof LOCALES;
  setLocale: (code: string) => void;
  /** Translate a key into the active locale with optional `{{var}}` values. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): LocaleCode {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) return resolveLocale(stored);
  return detectLocale();
}

/**
 * App-wide locale provider. Selection is persisted under `angisoft-language`
 * (mirroring the theme keys) and mirrored to <html lang/dir> for RTL + Intl.
 * Changing locale in one app/tab propagates to others via the storage event.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(readStoredLocale);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const meta = localeMeta(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = meta.dir;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) {
        setLocaleState(resolveLocale(event.newValue));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return undefined;
  }, []);

  const setLocale = useCallback((code: string) => {
    setLocaleState(resolveLocale(code));
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => {
    const meta = localeMeta(locale);
    return {
      locale,
      dir: meta.dir,
      label: meta.label,
      native: meta.native,
      locales: LOCALES,
      setLocale,
      t,
    };
  }, [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access translations. Throws outside a LanguageProvider so misuse is loud. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}

export default LanguageProvider;
