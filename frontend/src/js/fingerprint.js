/* eslint-disable no-unused-vars */
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint = null;

export async function getFingerprint() {
  if (cachedFingerprint) return cachedFingerprint;
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    return cachedFingerprint;
  } catch (err) {
    // Fallback: use a random string or 'unknown'
    const fallback = 'fp_' + Math.random().toString(36).substring(2, 15);
    cachedFingerprint = fallback;
    return fallback;
  }
}