import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    css: false,
    projects: [
      'apps/shell/vitest.config.js',
      'apps/widget-admin/vitest.config.js',
      'apps/widget-filter/vitest.config.js',
      'apps/widget-kpi/vitest.config.js',
      'apps/widget-trends/vitest.config.js',
      'packages/contracts/vitest.config.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      exclude: ['**/*.css'],
    },
  },
});
