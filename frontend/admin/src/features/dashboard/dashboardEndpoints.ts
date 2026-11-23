/**
 * Dashboard API contract — verified against the live backend mounts:
 *
 * - `backend/src/app.ts` mounts the staff router at `/v1/staff-dashboard`.
 * - `backend/src/shared/routes/admin.ts` defines `GET /dashboard/stats`, mounted
 *   by `backend/src/app.ts` under `/v1/admin`.
 *
 * The widget matrix previously referenced a staff path under `/v1/admin` and
 * an admin "overview" path; neither mount exists. Keep every dashboard fetch
 * on these constants so a future rename is a one-file change.
 */
export const DASHBOARD_ENDPOINTS = {
  staff: {
    effectiveAccess: '/v1/staff-dashboard/effective-access',
    projects: '/v1/staff-dashboard/projects',
    posts: '/v1/staff-dashboard/posts',
    bookings: '/v1/staff-dashboard/bookings',
    services: '/v1/staff-dashboard/services',
    // Verified at backend/src/app.ts:435 (`leadsRouter` owns `leads.view`).
    leads: '/v1/leads',
  },
  admin: {
    stats: '/v1/admin/dashboard/stats',
  },
} as const;
