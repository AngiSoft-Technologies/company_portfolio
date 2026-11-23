import { beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  dictionaries,
  detectLocale,
  loadDictionary,
  interpolate,
  localeMeta,
  resolveLocale,
  translate,
} from '@angisoft/i18n';

/**
 * i18n contract tests — no DOM/provider needed. Verifies locale resolution
 * (including BCP-47 tags), RTL metadata, per-key English fallback, and safe
 * `{{placeholder}}` interpolation across every supported locale.
 */
const EXPECTED_CODES = [
  'en', 'sw', 'fr', 'es', 'de', 'pt', 'it', 'nl', 'ru', 'uk', 'pl', 'tr',
  'ar', 'fa', 'hi', 'ja', 'ko', 'zh', 'id', 'vi', 'th',
] as const;

describe('i18n locales', () => {
  // Dictionaries are code-split in production; load the shared lazy bundle
  // before asserting the full 21-locale contract.
  beforeAll(async () => {
    await Promise.all(EXPECTED_CODES.map((code) => loadDictionary(code)));
  });

  it('registers all supported locales with Arabic and Persian as RTL', () => {
    expect(LOCALES.map((l) => l.code)).toEqual([...EXPECTED_CODES]);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(localeMeta('ar').dir).toBe('rtl');
    expect(localeMeta('fa').dir).toBe('rtl');
    for (const code of EXPECTED_CODES) {
      if (code === 'ar' || code === 'fa') continue;
      expect(localeMeta(code).dir).toBe('ltr');
    }
  });

  it('ships a complete dictionary for every registered locale', () => {
    const sourceKeys = Object.keys(dictionaries.en);
    expect(sourceKeys.length).toBe(115);
    for (const code of EXPECTED_CODES) {
      const dictionary = dictionaries[code];
      expect(dictionary, `missing dictionary for ${code}`).toBeDefined();
      const missing = sourceKeys.filter((key) => !dictionary?.[key as keyof typeof dictionary]);
      expect(missing, `${code} is missing keys: ${missing.join(', ')}`).toEqual([]);
    }
  });

  it('resolves BCP-47 tags and unknown values safely', () => {
    expect(resolveLocale('fr-CA')).toBe('fr');
    expect(resolveLocale('sw-KE')).toBe('sw');
    expect(resolveLocale('pt-BR')).toBe('pt');
    expect(resolveLocale('zh_Hans')).toBe('zh');
    expect(resolveLocale('ar-SA')).toBe('ar');
    expect(resolveLocale('fa-IR')).toBe('fa');
    expect(resolveLocale('de-DE')).toBe('de');
    expect(resolveLocale('xx-YY')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('detects a supported browser language without throwing outside the DOM', () => {
    // jsdom's navigator.language is 'en-US'; resolution must still succeed.
    expect([...EXPECTED_CODES]).toContain(detectLocale());
  });
});

describe('translation resolution', () => {
  beforeAll(async () => {
    await Promise.all(EXPECTED_CODES.map((code) => loadDictionary(code)));
  });

  it('returns the localized string when a key exists', () => {
    expect(translate('sw', 'common.save')).toBe('Hifadhi');
    expect(translate('fr', 'common.save')).toBe('Enregistrer');
    expect(translate('es', 'common.save')).toBe('Guardar');
    expect(translate('de', 'common.save')).toBe('Speichern');
    expect(translate('ja', 'common.save')).toBe('保存');
    expect(translate('ar', 'common.save')).toBe('حفظ');
  });

  it('falls back to English when a locale omits a key', () => {
    const englishFallback =
      'No FX is performed. KES settles via M-Pesa/PayHero; card payments settle in the quoted currency.';
    expect(translate('pt', 'finance.noFallback')).not.toBe(englishFallback); // complete dictionary
    expect(translate('de', 'finance.noFallback')).not.toBe(englishFallback);
    // An unregistered locale has no dictionary, so it falls back to English.
    expect(translate('zz', 'finance.noFallback')).toBe(englishFallback);
    expect(translate('xx', 'common.save')).toBe('Save');
  });

  it('translates the Phase 7 finance/communications keys in every locale', () => {
    for (const code of EXPECTED_CODES) {
      if (code === 'en') continue;
      expect(translate(code, 'admin.boardroom').length).toBeGreaterThan(0);
      expect(translate(code, 'admin.boardroom')).not.toBe('AI Boardroom');
      expect(translate(code, 'comms.consentRequired')).not.toBe(
        'Marketing consent is required before tracking events are sent.',
      );
      expect(translate(code, 'finance.settlements').length).toBeGreaterThan(0);
      expect(translate(code, 'finance.noFallback')).toMatch(/KES/);
    }
  });

  it('interpolates {{placeholders}} and handles missing vars safely', () => {
    expect(interpolate('Hello {{name}}', { name: 'AngiSoft' })).toBe('Hello AngiSoft');
    expect(interpolate('{{count}} items', { count: 3 })).toBe('3 items');
    // No vars object → template is returned untouched (never mangle literal braces).
    expect(interpolate('No vars {{missing}}')).toBe('No vars {{missing}}');
    // Vars object present but key missing → placeholder resolves to empty.
    expect(interpolate('Ok {{name}}', { other: 'x' })).toBe('Ok ');
  });
});
