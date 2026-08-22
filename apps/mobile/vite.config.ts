import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { blueDockTailwind } from '@blue-dock/config-tailwind/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8080';

export default defineConfig({
  envDir: rootDir,
  plugins: [blueDockTailwind(), react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, '../../packages/app/src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/avatar': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/ws': {
        target: apiTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
