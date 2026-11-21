import { test, expect } from '@playwright/test';
import { mockApi } from '../fixtures/mockApi';

/**
 * Public marketing site journeys — real Vite app, stubbed /api.
 */

test.describe('public site', () => {
  test('homepage renders hero and the theme toggle flips data-theme', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await mockApi(page, {
      'GET /api/site/hero': {
        slides: [{ id: 'h1', headline: 'We build software that scales', description: 'End-to-end product engineering.' }],
      },
    });
    await page.goto('/');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });

    const toggle = page.getByRole('button', { name: /switch to (light|dark) theme/i });
    await expect(toggle).toBeVisible();

    const readTheme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const before = await readTheme();
    await toggle.click();
    await expect.poll(readTheme).not.toBe(before);

    expect(errors).toEqual([]);
  });

  test('services page lists services returned by the API', async ({ page }) => {
    await mockApi(page, {
      'GET /api/services': [
        { id: 's1', slug: 'web-development', title: 'Web Development', description: 'Fast modern sites', active: true, category: 'Engineering' },
      ],
    });
    await page.goto('/services');
    await expect(page.getByText('Web Development').first()).toBeVisible({ timeout: 20_000 });
  });

  test('pricing page renders published packages', async ({ page }) => {
    await mockApi(page, {
      'GET /api/pricing-packages': [
        {
          id: 'p1', name: 'Growth Package', slug: 'growth', description: 'Everything package',
          price: 150000, currency: 'KES', billingPeriod: 'project',
          features: ['SEO setup', '30 days support'], published: true, highlighted: true,
        },
      ],
      'GET /api/services': [],
      'GET /api/site/pricing': {},
    });
    await page.goto('/pricing');
    await expect(page.getByText('Growth Package').first()).toBeVisible({ timeout: 20_000 });
  });

  test('contact page renders published offices', async ({ page }) => {
    await mockApi(page, {
      'GET /api/offices': [
        {
          id: 'o1', name: 'Nairobi HQ', slug: 'nairobi-hq',
          addressLine: '1 Riverside Drive', city: 'Nairobi', country: 'Kenya',
          phone: '+254700000000', email: 'hq@angisoft.co.ke', isHeadquarters: true,
          published: true, hours: [{ days: 'Mon-Fri', hours: '08:00-17:00' }],
        },
      ],
    });
    await page.goto('/contact');
    await expect(page.getByText('Nairobi HQ').first()).toBeVisible({ timeout: 20_000 });
  });
});
