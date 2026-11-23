/**
 * Code-split locale bundle. Importing this module dynamically keeps 20 full
 * translation dictionaries (≈90 kB) out of both app entry chunks; only the
 * active non-English locale downloads it once. English stays in the entry as
 * the synchronous fallback.
 */
import type { LocaleCode } from '../locales';
import type { Dictionary } from '.';
import { sw } from './sw';
import { fr } from './fr';
import { es } from './es';
import { de } from './de';
import { pt } from './pt';
import { it } from './it';
import { nl } from './nl';
import { ru } from './ru';
import { uk } from './uk';
import { pl } from './pl';
import { tr } from './tr';
import { ar } from './ar';
import { fa } from './fa';
import { hi } from './hi';
import { ja } from './ja';
import { ko } from './ko';
import { zh } from './zh';
import { id } from './id';
import { vi } from './vi';
import { th } from './th';

export const lazyDictionaries: Partial<Record<LocaleCode, Dictionary>> = {
  sw, fr, es, de, pt, it, nl, ru, uk, pl, tr,
  ar, fa, hi, ja, ko, zh, id, vi, th,
};
