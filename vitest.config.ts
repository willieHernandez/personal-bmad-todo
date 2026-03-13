import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'packages/client/src/**/*.{ts,tsx}',
        'packages/server/src/**/*.ts',
        'packages/shared/src/**/*.ts',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/__tests__/**',
        'packages/client/src/components/ui/**',
        'packages/shared/src/types/**',
        'packages/client/src/routeTree.gen.ts',
        'packages/shared/src/schemas/inbox.schema.ts',
        'packages/shared/src/schemas/session.schema.ts',
        'packages/shared/src/schemas/search.schema.ts',
        'packages/client/src/main.tsx',
        'packages/shared/src/index.ts',
        'packages/client/src/lib/utils.ts',
        'packages/server/src/db/test-db.ts',
        'packages/server/src/db/index.ts',
        'packages/server/src/integration/**',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    projects: [
      {
        test: {
          name: 'shared',
          root: './packages/shared',
          include: ['src/**/*.test.ts'],
        },
      },
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
