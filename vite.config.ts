import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      src: resolve('src'),
    },
  },
  build: {
    minify: true,
    sourcemap: true,
    lib: {
      name: '@nagisham/syren',
      entry: 'src/main.ts',
      fileName: 'main',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['@nagisham/standard'],
    },
  },
});
