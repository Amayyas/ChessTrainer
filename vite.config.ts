import { fileURLToPath, URL } from 'node:url'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { INDEXABLE_ROUTES } from './src/seo'

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

/**
 * robots.txt and sitemap.xml, generated rather than committed.
 *
 * Both must state the real domain, and neither can be a static file in public/
 * without repeating a value that already lives in the environment. Without them
 * the SPA rewrite answers both addresses with index.html and HTTP 200, so a
 * crawler asking for the sitemap is handed a web page and a submission to
 * Search Console fails.
 */
function discoveryFiles(mode: string): Plugin {
  const site = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '')
  return {
    name: 'discovery-files',
    generateBundle() {
      // No domain, no sitemap: <loc> must be absolute, so emitting one from a
      // build with VITE_SITE_URL unset — which is every local build and every
      // fork — would publish a file no crawler can read.
      if (site) {
        const urls = INDEXABLE_ROUTES.map((path) => `  <url><loc>${site}${path}</loc></url>`).join(
          '\n',
        )
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        })
      }
      // Everything is public; the only thing worth saying is where the sitemap
      // is. Named only when a domain is configured, since a relative sitemap
      // reference is not valid.
      const sitemap = site ? `Sitemap: ${site}/sitemap.xml\n` : ''
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${sitemap}`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Read through loadEnv rather than process.env: Vite does not populate
  // process.env from .env files while it is evaluating this config, so a token
  // placed in .env as documented would be read as absent. loadEnv reads those
  // files and still lets a real environment variable win, which is how Netlify
  // provides it.
  //
  // The SENTRY_ prefix does not expose anything to the browser — that is
  // envPrefix's job, and it remains VITE_. These stay build-only.
  const env = loadEnv(mode, process.cwd(), 'SENTRY_')

  // Uploading maps needs a token. Without one — every local build, every fork,
  // every CI run — none of this happens and nothing about the output changes.
  const authToken = env.SENTRY_AUTH_TOKEN

  return {
    plugins: [
      react(),
      siteUrl(mode),
      discoveryFiles(mode),
      /**
       * Source maps for the error reports.
       *
       * Without them a stack trace names index-BQu1muf7.js and a column number,
       * which says an error happened and nothing about where. With them it names
       * the file and line that were written.
       *
       * Nothing secret is being handed over: this code is AGPL and readable on
       * GitHub. What the upload buys is Sentry resolving minified frames, not
       * privacy either way.
       */
      ...(authToken
        ? [
            sentryVitePlugin({
              authToken,
              org: env.SENTRY_ORG ?? 'amayyas',
              project: env.SENTRY_PROJECT ?? 'chesstrainer',
              // The organisation lives in the EU region, and the default here is
              // the US one — a mismatch fails the upload rather than silently
              // sending data across, but it fails every build until it is set.
              url: env.SENTRY_URL ?? 'https://de.sentry.io',
              sourcemaps: {
                // Deleted once uploaded. Emitting them is necessary; serving them
                // is not, and a stray .map in dist would be published.
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
              },
              // A build that cannot reach Sentry must not stop a deploy: the
              // reports lose their resolution, the players lose nothing.
              errorHandler: (error) => {
                console.warn('[sentry] source maps not uploaded:', error.message)
              },
            }),
          ]
        : []),
    ],
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
      // "hidden" rather than true: the maps are written for the upload, but no
      // sourceMappingURL comment is added, so a browser never asks for one. Sentry
      // matches them by debug id instead. Off entirely without a token, since a
      // map that is generated and never deleted is a map that gets deployed.
      sourcemap: authToken ? ('hidden' as const) : false,
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
  }
})
