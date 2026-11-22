import { useId } from 'react';
import { useI18n } from './LanguageProvider';

/**
 * Minimal accessible locale picker. Styled by consumers via className; uses
 * native <select> so it works with keyboard and screen readers in both apps
 * without pulling UI dependencies into this package.
 */
export function LanguageSwitcher({
  className,
  label,
  showNative = true,
}: {
  className?: string;
  label?: string;
  showNative?: boolean;
}) {
  const { locale, locales, setLocale, t, dir } = useI18n();
  const id = useId();

  return (
    <div className={className} dir="ltr" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <label htmlFor={id} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {label ?? t('common.language')}
      </label>
      <span aria-hidden="true">{locales.find((l) => l.code === locale)?.flag}</span>
      <select
        id={id}
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        aria-label={label ?? t('common.language')}
        style={{ direction: dir === 'rtl' ? 'rtl' : 'ltr' }}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {showNative ? l.native : l.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSwitcher;
