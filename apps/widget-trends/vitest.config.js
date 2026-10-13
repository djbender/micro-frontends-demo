import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [svelte()],
  define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify('test') },
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
