/**
 * Backwards-compatible alias. The blog persistence/audit logic now lives in
 * `cms/services/blogService.ts`; this shim keeps existing imports working.
 */
export { blogService as blogController } from '../services/blogService';
