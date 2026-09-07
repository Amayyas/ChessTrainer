import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests against the real production build.
 *
 * jsdom stubs Worker and ResizeObserver, so nothing that actually renders —
 * the board, the engine analysing a position, a move being played — is covered
 * by the unit suite. These run a headless Chromium against `dist/` served the
 * way Netlify serves it (scripts/serve-dist.mjs), so a build that compiles but
 * does not work in a browser fails here rather than in production.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
