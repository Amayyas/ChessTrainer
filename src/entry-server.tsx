import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'

/**
 * Renders the app for one URL to a static HTML string, at build time.
 *
 * Only `/` is prerendered — see scripts/prerender.mjs — so this stays generic
 * rather than landing-specific: whatever tree main.tsx would mount for that
 * URL is what has to come out here, or hydration on the client finds a
 * mismatch and throws the markup away, losing the paint it was written for.
 */
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
