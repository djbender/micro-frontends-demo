import path from 'node:path';
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [angular({ tsconfig: path.resolve(import.meta.dirname, 'tsconfig.json') })],
  define: { 'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify('test') },
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
