import { test, expect } from '@playwright/test';

const ADMIN_URL = '/?permissions=dashboard.view,dashboard.admin';

async function waitForOverview(page) {
  await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
}

test.describe('route switching', () => {
  test('switching to admin tears down KPI widget', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await waitForOverview(page);

    await page.locator('.nav-btn', { hasText: 'admin' }).click();
    await expect(page.locator('body').getByText('Admin Panel')).toBeVisible();
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).not.toBeVisible();
  });

  test('switching back to overview remounts KPI widget', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await waitForOverview(page);

    await page.locator('.nav-btn', { hasText: 'admin' }).click();
    await expect(page.locator('body').getByText('Admin Panel')).toBeVisible();

    await page.locator('.nav-btn', { hasText: 'Overview' }).click();
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
    await expect(page.locator('body').getByText('Admin Panel')).not.toBeVisible();
  });

  test('no duplicate widgets after multiple route switches', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await waitForOverview(page);

    // Switch back and forth 3 times
    for (let i = 0; i < 3; i++) {
      await page.locator('.nav-btn', { hasText: 'admin' }).click();
      await expect(page.locator('body').getByText('Admin Panel')).toBeVisible();
      await page.locator('.nav-btn', { hasText: 'Overview' }).click();
      await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
    }

    // Should still be exactly one KPI Summary heading
    const kpiCount = await page.locator('text=KPI Summary').count();
    expect(kpiCount).toBe(1);
  });
});
