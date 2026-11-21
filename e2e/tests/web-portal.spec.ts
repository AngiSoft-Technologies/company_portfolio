import { test, expect } from '@playwright/test';
import { mockApi } from '../fixtures/mockApi';

/**
 * Client portal journey — magic-link session → dashboard with real data.
 */

const portalMocks = {
  'POST /api/client-portal/verify': { accessToken: 'client-token-1' },
  'GET /api/client-portal/bookings': {
    bookings: [{ id: 'bk_1', title: 'Website Redesign', status: 'IN_PROGRESS', createdAt: '2026-01-01T00:00:00Z' }],
  },
  'GET /api/client-portal/invoices': { invoices: [] },
  'GET /api/client-portal/quotes': { quotes: [] },
  'GET /api/client-portal/projects': {
    projects: [{ id: 'pr_1', title: 'Website Redesign', status: 'IN_PROGRESS', progress: 40 }],
  },
  'GET /api/client-portal/notifications': {
    notifications: [
      { id: 'n1', title: 'Invoice ready', message: 'Your invoice INV-1 is available.', read: false, createdAt: '2026-02-01T00:00:00Z' },
    ],
  },
};

test('portal magic link grants access and dashboard renders client data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await mockApi(page, portalMocks);
  await page.goto('/portal/access?token=magic-token');

  // verify → setClientAccessToken → navigate('/portal')
  await expect(page).toHaveURL(/\/portal$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: /client dashboard/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Website Redesign').first()).toBeVisible();
  await expect(page.getByText('Invoice ready')).toBeVisible();

  expect(errors).toEqual([]);
});

test('portal request page renders the email capture form', async ({ page }) => {
  await mockApi(page, {});
  await page.goto('/portal/request');
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 20_000 });
});
