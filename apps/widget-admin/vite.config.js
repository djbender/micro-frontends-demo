import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'widget-admin',
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
    'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify(pkg.version),
  },
  server: {
    port: 5005,
    origin: 'http://localhost:5005',
    cors: true,
  },
  base: 'http://localhost:5005/',
  build: {
    target: 'esnext',
  },
});
