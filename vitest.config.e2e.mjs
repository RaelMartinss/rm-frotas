import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts', 'src/**/*.e2e-spec.ts'],
    exclude: ['node_modules', 'dist'],
  },
});