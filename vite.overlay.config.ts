import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/overlay/floating-launcher.ts'),
      formats: ['iife'],
      name: 'PortalFloatingLauncher',
      fileName: () => 'overlay.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
