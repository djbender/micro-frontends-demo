import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    federation({
      name: 'widget-filter',
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
    port: 5004,
    origin: 'http://localhost:5004',
    cors: true,
  },
  base: 'http://localhost:5004/',
  build: {
    target: 'esnext',
  },
});
