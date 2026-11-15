import { test, expect } from '@playwright/test';

async function waitForAlerts(page) {
  await page.goto('/');
  await expect(page.locator('[data-slot="main"] [data-widget="alerts"]').getByText('Recent Alerts')).toBeVisible();
}

test.describe('widget-alerts (Angular)', () => {
  test('mounts in the main slot with its version badge and the 30d/all baseline', async ({ page }) => {
    await waitForAlerts(page);
    const alerts = page.locator('[data-slot="main"] [data-widget="alerts"]');
    await expect(alerts.getByText('widget-alerts: 1.0.0')).toBeVisible();
    await expect(alerts.getByText('All segments · 30d · 9 alerts')).toBeVisible();
  });

  test('clicking 7d narrows the alerts and logs a consume event on the bus', async ({ page }) => {
    await waitForAlerts(page);

    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      el.shadowRoot.querySelector('[data-range="7d"]').click();
    });

    await expect(page.locator('[data-widget="alerts"]').getByText('All segments · 7d · 5 alerts')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Event log' }).getByText('widget-alerts ← consume filter-change').first()).toBeVisible();
  });

  test('changing segment to enterprise filters rows', async ({ page }) => {
    await waitForAlerts(page);

    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      const select = el.shadowRoot.querySelector('#segment');
      select.value = 'enterprise';
      select.dispatchEvent(new Event('change'));
    });

    await expect(page.locator('[data-widget="alerts"]').getByText('Enterprise · 30d · 3 alerts')).toBeVisible();
  });

  test('local severity form and search narrow the table independently of the bus', async ({ page }) => {
    await waitForAlerts(page);
    const alerts = page.locator('[data-widget="alerts"]');

    await alerts.getByLabel('Severity').selectOption('critical');
    await expect(alerts.getByText('All segments · 30d · 3 alerts')).toBeVisible();

    await alerts.getByLabel('Search alerts').fill('checkout');
    await expect(alerts.getByText('All segments · 30d · 1 alert')).toBeVisible();
    await expect(alerts.getByRole('cell', { name: 'Checkout error rate' })).toBeVisible();
  });

  test('is restored with the last filter after a route re-mount (handshake)', async ({ page }) => {
    await waitForAlerts(page);

    await page.locator('[data-slot="toolbar"] filter-widget').evaluate((el) => {
      el.shadowRoot.querySelector('[data-range="7d"]').click();
    });
    await expect(page.locator('[data-widget="alerts"]').getByText('All segments · 7d · 5 alerts')).toBeVisible();

    await page.click('.nav-btn.active'); // re-trigger the route → unmount + remount
    await expect(page.locator('[data-widget="alerts"]')).toHaveCount(1); // no duplicate mounts
    await expect(page.locator('[data-widget="alerts"]').getByText('All segments · 7d · 5 alerts')).toBeVisible();
  });
});
