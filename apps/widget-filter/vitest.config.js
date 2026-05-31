import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __WIDGET_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
