import type { LocaleCode } from '../locales';
import type { TranslationKey } from './en';
import { en } from './en';
import { sw } from './sw';
import { fr } from './fr';
import { es } from './es';
import { zh } from './zh';
import { ar } from './ar';

export type Dictionary = Partial<Record<TranslationKey, string>>;

/** Every locale's dictionary. English is complete; others fall back per key. */
export const dictionaries: Record<LocaleCode, Dictionary> = { en, sw, fr, es, zh, ar };

export { en };
export type { TranslationKey } from './en';
