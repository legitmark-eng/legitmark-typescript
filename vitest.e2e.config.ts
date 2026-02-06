import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e.test.ts'],
    sequence: { concurrent: false }, // Steps depend on each other
    testTimeout: 30000,
  },
});
