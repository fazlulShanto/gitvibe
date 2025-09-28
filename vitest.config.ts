import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./packages/core/tests/setup.ts'],
    include: [
      'packages/*/tests/**/*.test.ts',
      'apps/*/tests/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    exclude: ['node_modules', 'dist'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'packages/*/tests/',
        'apps/*/tests/',
        'tests/',
        'bin/',
        '**/*.d.ts',
        '**/*.config.ts',
        'coverage/',
      ],
    },
  },
})