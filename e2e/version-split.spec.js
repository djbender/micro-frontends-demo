import { test, expect } from '@playwright/test';

test.describe('version traffic splitting', () => {
  test('default token shows bucket 1 chip and KPI v1.0.0', async ({ page }) => {
    await page.goto('/?token=default');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
    await expect(page.locator('.traffic-chip')).toHaveText('bucket 1');
    await expect(page.locator('[data-slot="main"]').getByText('v1.0.0')).toBeVisible();
  });

  test('canary token shows bucket 100 chip and KPI v1.1.0', async ({ page }) => {
    await page.goto('/?token=canary');
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible();
    await expect(page.locator('.traffic-chip')).toHaveText('bucket 100');
    await expect(page.locator('[data-slot="main"]').getByText('v1.1.0')).toBeVisible();
  });
});
