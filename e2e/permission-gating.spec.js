import { test, expect } from '@playwright/test';

test.describe('permission gating', () => {
  test('non-admin user does not see admin nav button', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
    await expect(page.locator('.nav-btn', { hasText: 'admin' })).not.toBeVisible();
  });

  test('non-admin user sees KPI and Trends but not Admin Panel', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
    await expect(page.locator('body').getByText('Admin Panel')).not.toBeVisible();
  });

  test('admin user sees admin nav button', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view,dashboard.admin');
    await page.waitForSelector('.shell');
    await page.waitForSelector('.nav-btn');
    await expect(page.locator('.nav-btn', { hasText: 'admin' })).toBeVisible();
  });

  test('admin user can load Admin Panel on /admin route', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view,dashboard.admin');
    await page.waitForSelector('.shell');
    await page.locator('.nav-btn', { hasText: 'admin' }).click();
    await expect(page.locator('body').getByText('Admin Panel')).toBeVisible();
  });

  test('admin route does not show KPI widget', async ({ page }) => {
    await page.goto('/?permissions=dashboard.view,dashboard.admin');
    await page.waitForSelector('.shell');
    await page.locator('.nav-btn', { hasText: 'admin' }).click();
    await expect(page.locator('body').getByText('Admin Panel')).toBeVisible();
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).not.toBeVisible();
  });
});
