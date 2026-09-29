import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000, // Phaser alone is ~1.2 MB minified
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
