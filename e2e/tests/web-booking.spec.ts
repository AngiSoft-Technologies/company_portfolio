import { test, expect } from '@playwright/test';
import { mockApi } from '../fixtures/mockApi';

/**
 * Booking journey — the primary conversion path on the public site.
 * Three-step form → POST /api/bookings (multipart) → redirect to /bookings.
 */

test('booking form submits and redirects to booking history', async ({ page }) => {
  let postedTitle = '';

  await mockApi(page, {
    'GET /api/site/booking': {
      steps: [
        { id: 1, title: 'Your details', icon: 'FaUser' },
        { id: 2, title: 'About the project', icon: 'FaFileAlt' },
        { id: 3, title: 'Review & submit', icon: 'FaCreditCard' },
      ],
      projectTypes: [{ value: 'web', label: 'Web Application' }],
    },
    'GET /api/site/pricing': {},
    'GET /api/services': [],
    'POST /api/bookings': (ctx) => {
      // Multipart body — pull the project title out of the raw payload.
      const body = ctx.postData ?? '';
      const m = body.match(/name="title"\r?\n\r?\n([^\r\n]+)/);
      postedTitle = m?.[1] ?? '';
      return {
        status: 201,
        body: {
          booking: { id: 'bk_1', publicReference: 'BK-TEST-1', title: postedTitle },
          trackingPath: '/bookings/BK-TEST-1',
        },
      };
    },
    'GET /api/bookings/my': { bookings: [] },
    'GET /api/bookings*': { bookings: [] },
  });

  await page.goto('/book');

  // Step 1 — contact + project title
  await page.locator('input[name="name"]').fill('Jane Client');
  await page.locator('input[name="email"]').fill('jane@example.com');
  await page.locator('input[name="title"]').fill('Clinic Management System');
  await page.getByRole('button', { name: /^Next/ }).click();

  // Step 2 — description
  await page.locator('textarea[name="description"]').fill('A patient management system for a downtown clinic.');
  await page.getByRole('button', { name: /^Next/ }).click();

  // Step 3 — submit (deposit optional, left unchecked). The wizard can
  // auto-advance the final step during the Next click's rerender, so only
  // click Submit if it's actually present.
  const submit = page.getByRole('button', { name: /Submit Booking/ });
  const submitVisible = await submit.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false);
  if (submitVisible) await submit.click();

  // Redirect lands on /bookings after ~1.2s; assert the POST carried the title.
  await expect(page).toHaveURL(/\/bookings/, { timeout: 20_000 });
  expect(postedTitle).toBe('Clinic Management System');
});
