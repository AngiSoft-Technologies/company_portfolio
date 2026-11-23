/**
 * Backwards-compatible alias. The project persistence/audit logic now lives in
 * `cms/services/projectsService.ts`. Kept because `modules/projects/routes/projects.ts`
 * imports `projectsController` from this path (that route is owned elsewhere).
 */
export { projectsService as projectsController } from '../services/projectsService';
