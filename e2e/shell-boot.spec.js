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
    await expect(page.locator('[data-slot="side"]').getByRole('heading', { name: 'Trends' })).toBeVisible();
  });

  test('filter mini mirror renders in side slot', async ({ page }) => {
    await page.goto('/');
    const sideFilter = page.locator('[data-slot="side"] filter-widget');
    await expect(sideFilter).toBeAttached();
    await expect(sideFilter.locator('.mini-value')).toContainText('30d · All');
  });

  test('changing the toolbar filter syncs the side mini mirror', async ({ page }) => {
    await page.goto('/');
    const sideValue = page.locator('[data-slot="side"] filter-widget .mini-value');
    await expect(sideValue).toContainText('30d · All');
    await page.locator('[data-slot="toolbar"] filter-widget').getByRole('button', { name: '90d' }).click();
    await expect(sideValue).toContainText('90d · All');
  });

  test('Overview nav button is active on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shell');
    await expect(page.locator('.nav-btn.active')).toContainText('Overview');
  });
});
