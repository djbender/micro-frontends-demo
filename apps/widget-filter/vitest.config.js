import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify('test') },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
