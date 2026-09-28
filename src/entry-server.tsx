import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import type { RoutePath } from '@/routes'
import { withRouteHead } from '@/seo'

/**
 * Renders the app for one URL to a static HTML string, at build time.
 *
 * Only `/` is prerendered — see scripts/prerender.mjs — so this stays generic
 * rather than landing-specific: whatever tree main.tsx would mount for that
 * URL is what has to come out here, or hydration on the client finds a
 * mismatch and throws the markup away, losing the paint it was written for.
 */
export { INDEXABLE_ROUTES } from '@/seo'

/**
 * `withRouteHead` bound to the domain this build was made for. The SSR build
 * reads VITE_SITE_URL the way the client build does, so the prerender script
 * gets the same domain without reading the environment a second time.
 */
export function routeHead(html: string, path: RoutePath) {
  return withRouteHead(html, path, import.meta.env.VITE_SITE_URL ?? '')
}

export function render(url: string) {
  return renderToString(
    <React.StrictMode>
      <ErrorBoundary>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
