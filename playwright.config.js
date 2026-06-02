import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 1000,
  use: {
    baseURL: 'http://localhost:5000',
  },
  webServer: [
    { command: 'pnpm --filter shell run preview', url: 'http://localhost:5000', reuseExistingServer: true },
    { command: 'pnpm --filter widget-kpi run preview', url: 'http://localhost:5001', reuseExistingServer: true },
    { command: 'pnpm --filter widget-kpi run preview:v1-1-0', url: 'http://localhost:5002', reuseExistingServer: true },
    { command: 'pnpm --filter widget-trends run preview', url: 'http://localhost:5003', reuseExistingServer: true },
    { command: 'pnpm --filter widget-filter run preview', url: 'http://localhost:5004', reuseExistingServer: true },
    { command: 'pnpm --filter widget-admin run preview', url: 'http://localhost:5005', reuseExistingServer: true },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
