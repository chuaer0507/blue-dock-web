import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { blueDockTailwind } from '@blue-dock/config-tailwind/vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const apiTarget = env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8080';

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: 'out/main',
        rollupOptions: {
          input: {
            index: resolve(rootDir, 'src/main/index.ts'),
          },
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: 'out/preload',
        rollupOptions: {
          input: {
            index: resolve(rootDir, 'src/preload/index.ts'),
          },
        },
      },
    },
    renderer: {
      root: rootDir,
      envDir: rootDir,
      build: {
        outDir: 'out/renderer',
        rollupOptions: {
          input: {
            index: resolve(rootDir, 'index.html'),
          },
        },
      },
      plugins: [blueDockTailwind(), react()],
      resolve: {
        alias: {
          '@': resolve(rootDir, '../../packages/app/src'),
        },
      },
      server: {
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
    },
  };
});
