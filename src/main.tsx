import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import { bufferEarlyErrors, reportError, startMonitoring } from '@/lib/monitoring'
import '@/lib/fonts'
import '@/index.css'

// Before anything else runs, so a failure during startup is still caught.
bufferEarlyErrors()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root element not found in index.html')

const tree = (
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)

// index.html for '/' ships with server-rendered markup already inside #root —
// see scripts/prerender.mjs — so the first paint does not wait on this script.
// Every other address is served app.html instead, whose #root is empty, and
// hydrating an empty root just falls back to a plain client render.
if (rootElement.hasChildNodes()) {
  ReactDOM.hydrateRoot(rootElement, tree, {
    // A lazy chunk below the fold (the coach's ChessBoard) can resolve while
    // this boundary is still hydrating, which React treats as recoverable: it
    // re-renders that one boundary client-side and reports the mismatch here
    // instead of throwing. Left at its default, that report is a console.error,
    // which reads as a broken page to anything grading the console rather than
    // the once-per-boundary hiccup it actually is.
    onRecoverableError: (error) => void reportError(error),
  })
} else {
  ReactDOM.createRoot(rootElement).render(tree)
}

// After the first render, and not awaited: reporting must never hold up the app.
startMonitoring()
