import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, cpSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, 'src/newtab/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'service-worker.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-extension-manifest-and-icons',
      closeBundle() {
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        if (existsSync('manifest.json')) {
          copyFileSync('manifest.json', 'dist/manifest.json');
        }
        if (existsSync('public/icons')) {
          cpSync('public/icons', 'dist/icons', { recursive: true });
        }
        if (existsSync('dist/src/newtab/index.html')) {
          copyFileSync('dist/src/newtab/index.html', 'dist/index.html');
          copyFileSync('dist/src/newtab/index.html', 'dist/newtab.html');
        }
        // Also ensure service-worker.js and overlay.js exist at root if user loads repo root
        if (existsSync('dist/service-worker.js')) {
          copyFileSync('dist/service-worker.js', 'service-worker.js');
        }
        if (existsSync('dist/overlay.js')) {
          copyFileSync('dist/overlay.js', 'overlay.js');
        }
      },
    },
  ],
});
