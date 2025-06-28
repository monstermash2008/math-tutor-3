/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        'src/routeTree.gen.ts', // Generated file
        'convex/_generated/**', // Generated files
        'src/components/ui/**', // UI components often have lower coverage
        'src/routes/**', // Route components are harder to unit test
        'src/integrations/**', // Integration/provider components
      ],
      include: [
        'src/**/*.{ts,tsx}',
      ],
      thresholds: {
        statements: 45,
        branches: 70,
        functions: 60,
        lines: 45,
      },
      // Show individual file coverage in terminal
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}); 