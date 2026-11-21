export const CONSENT_VERSION = '2026-11-21-privacy-terms';
const CONSENT_STORAGE_KEY = 'angisoft.client-consent';

export type ConsentRecord = {
  version: string;
  privacy: boolean;
  terms: boolean;
  acceptedAt: string;
};

export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as ConsentRecord;
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/** Acceptance is current only when both policies were accepted at this version. */
export function hasAcceptedConsent(): boolean {
  const consent = readConsent();
  return !!consent && consent.version === CONSENT_VERSION && consent.privacy && consent.terms;
}

export function storeConsent(): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    privacy: true,
    terms: true,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

/** Avoid open redirects while preserving the original booking/portal destination. */
export function safeConsentNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
