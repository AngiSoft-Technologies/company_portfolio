import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  detectLocale,
  interpolate,
  localeMeta,
  resolveLocale,
  translate,
} from '@angisoft/i18n';

/**
 * i18n contract tests — no DOM/provider needed. Verifies locale resolution
 * (including BCP-47 tags), RTL metadata, per-key English fallback, and safe
 * `{{placeholder}}` interpolation across all six supported locales.
 */
describe('i18n locales', () => {
  it('registers exactly the six supported locales with Arabic as RTL', () => {
    expect(LOCALES.map((l) => l.code)).toEqual(['en', 'sw', 'fr', 'es', 'zh', 'ar']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(localeMeta('ar').dir).toBe('rtl');
    for (const code of ['en', 'sw', 'fr', 'es', 'zh'] as const) {
      expect(localeMeta(code).dir).toBe('ltr');
    }
  });

  it('resolves BCP-47 tags and unknown values safely', () => {
    expect(resolveLocale('fr-CA')).toBe('fr');
    expect(resolveLocale('sw-KE')).toBe('sw');
    expect(resolveLocale('zh_Hans')).toBe('zh');
    expect(resolveLocale('ar-SA')).toBe('ar');
    expect(resolveLocale('de-DE')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it('detects a supported browser language without throwing outside the DOM', () => {
    // jsdom's navigator.language is 'en-US'; resolution must still succeed.
    expect(['en', 'sw', 'fr', 'es', 'zh', 'ar']).toContain(detectLocale());
  });
});

describe('translation resolution', () => {
  it('returns the localized string when a key exists', () => {
    expect(translate('sw', 'common.save')).toBe('Hifadhi');
    expect(translate('fr', 'common.save')).toBe('Enregistrer');
    expect(translate('es', 'common.save')).toBe('Guardar');
    expect(translate('zh', 'common.save')).toBe('保存');
    expect(translate('ar', 'common.save')).toBe('حفظ');
  });

  it('falls back to English when a locale omits a key', () => {
    // All six registered locales now translate every source key, so exercise
    // the same fallback path with an unregistered locale (no dictionary → en).
    expect(translate('de', 'common.save')).toBe('Save');
    const englishFallback =
      'No FX is performed. KES settles via M-Pesa/PayHero; card payments settle in the quoted currency.';
    expect(translate('pt', 'finance.noFallback')).toBe(englishFallback);
  });

  it('translates the Phase 7 finance/communications keys in every locale', () => {
    for (const code of ['sw', 'fr', 'es', 'zh', 'ar'] as const) {
      // Non-empty and not identical to the English source (properly localized).
      expect(translate(code, 'admin.boardroom').length).toBeGreaterThan(0);
      expect(translate(code, 'admin.boardroom')).not.toBe('AI Boardroom');
      expect(translate(code, 'comms.consentRequired')).not.toBe(
        'Marketing consent is required before tracking events are sent.',
      );
      expect(translate(code, 'finance.settlements').length).toBeGreaterThan(0);
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
