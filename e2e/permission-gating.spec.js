import { test, expect } from '@playwright/test';

test.describe('permission gating', () => {
  test('non-admin user does not see admin nav button', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.nav-btn', { hasText: 'admin' })).not.toBeVisible();
  });

  test('non-admin user sees KPI and Trends but not Admin Panel', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body').getByText('Admin Panel')).not.toBeVisible();
  });

  test('admin user sees admin nav button', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view,dashboard.admin');
    await page.waitForSelector('.shell', { timeout: 15000 });
    await page.waitForSelector('.nav-btn', { timeout: 15000 });
    await expect(page.locator('.nav-btn', { hasText: 'admin' })).toBeVisible({ timeout: 10000 });
  });

  test('admin user can load Admin Panel on /admin route', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view,dashboard.admin');
    await page.waitForSelector('.shell', { timeout: 15000 });
    await page.locator('.nav-btn', { hasText: 'admin' }).click({ timeout: 10000 });
    await expect(page.locator('body').getByText('Admin Panel')).toBeVisible({ timeout: 10000 });
  });

  test('admin route does not show KPI widget', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view,dashboard.admin');
    await page.waitForSelector('.shell', { timeout: 15000 });
    await page.locator('.nav-btn', { hasText: 'admin' }).click({ timeout: 10000 });
    await expect(page.locator('body').getByText('Admin Panel')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).not.toBeVisible();
  });
});
