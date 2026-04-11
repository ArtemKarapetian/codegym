import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['server/__tests__/**/*.test.ts'],
    setupFiles: ['./server/__tests__/setup.ts'],
    pool: 'forks',
    globals: false,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
