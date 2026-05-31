import { test, expect } from '@playwright/test';

async function waitForShell(page) {
  await page.goto('/');
  await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible({ timeout: 15000 });
}

test.describe('filter reactivity', () => {
  test('default revenue value is $482.0k (30d/all baseline)', async ({ page }) => {
    await waitForShell(page);
    await expect(page.locator('[data-slot="main"]').getByText('$482.0k')).toBeVisible();
  });

  test('clicking 7d updates KPI revenue to $120.5k', async ({ page }) => {
    await waitForShell(page);

    // Click 7d button inside the filter widget's shadow DOM
    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      el.shadowRoot.querySelector('[data-range="7d"]').click();
    });

    await expect(page.locator('[data-slot="main"]').getByText('$120.5k')).toBeVisible({ timeout: 5000 });
  });

  test('clicking 7d updates Trends footer to "All segments · 7d"', async ({ page }) => {
    await waitForShell(page);

    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      el.shadowRoot.querySelector('[data-range="7d"]').click();
    });

    await expect(page.locator('[data-slot="side"]').getByText('All segments · 7d')).toBeVisible({ timeout: 5000 });
  });

  test('changing segment to enterprise updates both KPI and Trends', async ({ page }) => {
    await waitForShell(page);

    // Change segment select inside shadow DOM
    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      const select = el.shadowRoot.querySelector('#segment');
      select.value = 'enterprise';
      select.dispatchEvent(new Event('change'));
    });

    // KPI revenue: 482k * 0.4 = 192.8k
    await expect(page.locator('[data-slot="main"]').getByText('$192.8k')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-slot="side"]').getByText('Enterprise · 30d')).toBeVisible({ timeout: 5000 });
  });

  test('REQUEST_FILTER handshake restores filter after route switch', async ({ page }) => {
    await waitForShell(page);

    // Change to 7d
    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      el.shadowRoot.querySelector('[data-range="7d"]').click();
    });
    await expect(page.locator('[data-slot="main"]').getByText('$120.5k')).toBeVisible({ timeout: 5000 });

    // Switch to admin route (only visible if admin permission — but default user doesn't have it)
    // So test the route switch back via Overview button (re-mount cycle)
    await page.click('.nav-btn.active'); // Click Overview again to re-trigger route
    await expect(page.locator('[data-slot="main"]').getByText('KPI Summary')).toBeVisible({ timeout: 10000 });
    // After remount, KPI dispatches REQUEST_FILTER, filter responds with last state (7d)
    await expect(page.locator('[data-slot="main"]').getByText('$120.5k')).toBeVisible({ timeout: 5000 });
  });
});
