import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['server/**/*.ts'],
      exclude: [
        'server/**/*.d.ts',
        'server/vite.ts',
        'server/index.ts',
        'server/db.ts',
        'server/firebase.ts',
        'server/mongodb.ts',
      ],
      reportOnFailure: true,
      all: true,
      clean: true,
      cleanOnRerun: true,
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});

