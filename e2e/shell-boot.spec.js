import { test, expect } from '@playwright/test';

test.describe('shell boot', () => {
  test('page loads without error', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shell');
    await expect(page.locator('.shell-error')).not.toBeVisible();
  });

  test('KPI widget renders in main slot', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
  });

  test('filter widget renders in toolbar slot', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-slot="toolbar"] filter-widget')).toBeAttached();
  });

  test('trends widget renders in side slot', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-slot="side"]').getByText('Trends')).toBeVisible();
  });

  test('Overview nav button is active on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shell');
    await expect(page.locator('.nav-btn.active')).toContainText('Overview');
  });
});
