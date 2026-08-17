import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import { bufferEarlyErrors, startMonitoring } from '@/lib/monitoring'
import '@/lib/fonts'
import '@/index.css'

// Before anything else runs, so a failure during startup is still caught.
bufferEarlyErrors()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root element not found in index.html')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// After the first render, and not awaited: reporting must never hold up the app.
startMonitoring()
