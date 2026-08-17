import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Absolute URLs for the social preview tags.
 *
 * Scrapers do not run the app, so these have to be in the served HTML rather
 * than set from React. The site has no domain yet: when VITE_SITE_URL is unset
 * the placeholder collapses to nothing and the paths stay relative, which is
 * degraded but valid — rather than shipping a literal `%VITE_SITE_URL%`.
 */
function siteUrl(mode: string): Plugin {
  const value = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.split('__SITE_URL__').join(value),
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), siteUrl(mode)],
  // Sentry ships its tracing and debug code unless these are switched off at
  // build time; tracesSampleRate only disables tracing at runtime, leaving the
  // bytes in the bundle. This app reports errors and nothing else.
  define: {
    __SENTRY_DEBUG__: false,
    __SENTRY_TRACING__: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The manifest lets the size guard tell the initial bundle apart from the
    // lazily loaded route chunks, so its budget measures first-load JS only.
    manifest: true,
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    environment: 'jsdom',
    // Tests always run as if no backend were configured: that is what CI sees
    // (it holds no secrets) and it keeps them off the network entirely.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/*.{test,spec}.{ts,tsx}',
      ],
    },
  },
}))
