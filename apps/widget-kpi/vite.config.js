import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'widget-kpi',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.jsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19' },
        'react-dom': { singleton: true, requiredVersion: '^19' },
      },
      dts: false,
    }),
  ],
  define: {
    __WIDGET_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5001,
    origin: 'http://localhost:5001',
    cors: true,
  },
  base: 'http://localhost:5001/',
  build: {
    target: 'esnext',
  },
});
