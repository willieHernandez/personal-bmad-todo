import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          root: './packages/server',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'client',
          root: './packages/client',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
