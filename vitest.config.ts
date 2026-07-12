import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['visual-tests/**', 'node_modules/**', 'dist/**'],
  },
});
