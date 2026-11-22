import { test, expect } from '@playwright/test';
import { mockApi } from '../fixtures/mockApi';

/**
 * Admin ERP journeys — login, session guard, and a guarded feature screen.
 */

const EFFECTIVE_ACCESS = {
  version: 1,
  employeeId: 'emp_admin',
  systemRole: 'ADMIN',
  permissions: [{ key: '*', effect: 'GRANT', source: 'SYSTEM' }],
  assignmentCounts: { products: 0, projects: 0, bookings: 0, enquiries: 0, publications: 0 },
  widgets: [],
  preferences: { theme: 'system', layout: 'default' },
};

const shellMocks = {
  'GET /api/staff-dashboard/effective-access': EFFECTIVE_ACCESS,
};

test('login authenticates and lands on the admin dashboard', async ({ page }) => {
  let loginBody: Record<string, unknown> | null = null;

  await mockApi(page, {
    ...shellMocks,
    'POST /api/auth/login': (ctx) => {
      loginBody = JSON.parse(ctx.postData ?? '{}');
      return { accessToken: 'admin-access-token' };
    },
    'GET /api/admin/dashboard/stats': {},
  });

  await page.goto('/login');
  await page.locator('input[type="email"]').fill('sangera@angisoft.co.ke');
  await page.locator('input[type="password"]').fill('correct-horse');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20_000 });
  expect(loginBody).toMatchObject({ email: 'sangera@angisoft.co.ke', password: 'correct-horse' });
});

test('unauthenticated visit to a guarded route redirects to /login', async ({ page }) => {
  await mockApi(page, {
    'POST /api/auth/refresh': { status: 401, body: { error: 'no session' } },
  });
  await page.goto('/payroll');
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
});

test('payroll screen renders payslips for an authenticated admin', async ({ page }) => {
  await mockApi(page, {
    'POST /api/auth/refresh': { accessToken: 'admin-access-token' },
    ...shellMocks,
    'GET /api/payroll/admin': [
      {
        id: 'ps_1', employeeId: 'emp_1', period: '2026-10', grossAmount: '100000',
        deductions: [{ label: 'PAYE', amount: '30000' }], netAmount: '70000',
        currency: 'KES', status: 'paid', createdAt: '2026-10-01T00:00:00Z',
        employee: { id: 'emp_1', firstName: 'Ada', lastName: 'Staff', email: 'ada@x.co' },
      },
    ],
    'GET /api/payroll/runs': [],
    'GET /api/payroll/admin/structures': [],
    'GET /api/admin/employees': [{ id: 'emp_1', firstName: 'Ada', lastName: 'Staff', email: 'ada@x.co' }],
  });

  await page.goto('/payroll');
  await expect(page.getByText('2026-10')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('cell', { name: 'Ada Staff' })).toBeVisible();
});

test('admin theme toggle flips data-theme and persists via profile PUT', async ({ page }) => {
  let putBody: Record<string, unknown> | null = null;

  await mockApi(page, {
    'POST /api/auth/refresh': { accessToken: 'admin-access-token' },
    ...shellMocks,
    'GET /api/admin/dashboard/stats': {},
    'PUT /api/staff-dashboard/profile': (ctx) => {
      putBody = JSON.parse(ctx.postData ?? '{}');
      return {};
    },
  });

  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Toggle theme' });
  await expect(toggle).toBeVisible({ timeout: 20_000 });

  const readTheme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const before = await readTheme();
  await toggle.click();
  await expect.poll(readTheme).not.toBe(before);
  await expect.poll(() => putBody).not.toBeNull();
});
