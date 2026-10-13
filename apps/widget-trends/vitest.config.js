import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify('test') },
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Vitest 5 externalizes node_modules by default; svelte-core ships a raw
    // .svelte file that must go through the Svelte plugin.
    server: {
      deps: { inline: [/@testing-library\/svelte/] },
    },
  },
});
