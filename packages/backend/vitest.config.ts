import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Run each test file in an isolated worker to prevent state leakage
    pool: 'forks',
    // Coverage via v8 (built into Node)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/payroll/engines/**/*.ts'],
      exclude: ['src/modules/payroll/engines/types.ts'],
    },
  },
  resolve: {
    alias: {
      // Allow TypeScript .js extension imports to resolve correctly in tests.
      // When TS is compiled for ESM compatibility the imports use .js; Vite
      // resolves .ts transparently, but the alias below handles edge cases.
      '@freight-payroll/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
})
