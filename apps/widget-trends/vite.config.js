import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { federation } from '@module-federation/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    svelte(),
    federation({
      name: 'widget-trends',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.js',
      },
      shared: {},
      dts: false,
    }),
  ],
  define: {
    __WIDGET_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5003,
    origin: 'http://localhost:5003',
    cors: true,
  },
  base: 'http://localhost:5003/',
  build: {
    target: 'esnext',
  },
});
