import { defineConfig } from 'vitest/config'

/**
 * The policy tests, kept apart from the rest.
 *
 * They need a Postgres with the migrations applied, which `npm test` must not:
 * the browser suite has to stay fast and runnable with nothing installed. This
 * runs on its own, in CI and on demand.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts'],
    // One connection, one transaction per test: parallel files would fight over
    // the same rows and the same role.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
})
