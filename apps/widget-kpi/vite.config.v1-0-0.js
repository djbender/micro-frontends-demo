import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const port = 5001;
const version = '1.0.0';
const origin = `http://localhost:${port}`;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: `widget-kpi_${version.replace(/\./g, '_')}`,
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
    'import.meta.env.VITE_WIDGET_VERSION': JSON.stringify(version),
  },
  server: {
    port,
    origin,
    cors: true,
  },
  base: `${origin}/`,
  build: {
    target: 'esnext',
    outDir: 'dist/v1-0-0',
  },
});
