import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: '^19' },
        'react-dom': { singleton: true, requiredVersion: '^19' },
      },
      dts: false,
    }),
  ],
  server: {
    port: 5000,
    origin: 'http://localhost:5000',
  },
  base: 'http://localhost:5000/',
  build: {
    target: 'esnext',
  },
});
