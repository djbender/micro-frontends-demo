import path from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { federation } from '@module-federation/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    angular({ tsconfig: path.resolve(import.meta.dirname, 'tsconfig.json') }),
    federation({
      name: 'widget-alerts',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.js',
      },
      shared: {},
      dts: false,
    }),
  ],
  define: {
    'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify(pkg.version),
  },
  server: {
    port: 5007,
    origin: 'http://localhost:5007',
    cors: true,
  },
  base: 'http://localhost:5007/',
  build: {
    target: 'esnext',
  },
});
