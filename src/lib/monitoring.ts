/**
 * Error reporting.
 *
 * Two constraints shape this file.
 *
 * The SDK weighs more than the entire rest of the app's third-party code, so it
 * is imported dynamically: it lands in its own chunk, after first paint, and
 * never counts against the initial bundle budget. The cost of that choice is a
 * window at startup where the SDK is not listening yet — which is exactly when
 * the errors worth catching happen. So a few lines of native listeners are
 * installed synchronously, buffer whatever occurs, and hand it over once the SDK
 * is ready.
 *
 * The second constraint is that this app must not leak personal data. The
 * privacy policy states no analytics and no tracking, and that stays true: no
 * IP address, no user identity, no session recording, no performance tracing.
 * Only the error itself.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

/** Errors that happened before the SDK finished loading. */
const pending: unknown[] = []
/** Bounded, so a fast error loop before load cannot exhaust memory. */
const MAX_PENDING = 20

let onError: ((event: ErrorEvent) => void) | null = null
let onRejection: ((event: PromiseRejectionEvent) => void) | null = null

function remember(reason: unknown) {
  if (pending.length < MAX_PENDING) pending.push(reason)
}

/**
 * Starts buffering immediately. Safe to call whether or not reporting is
 * configured — without a DSN it does nothing at all.
 */
export function bufferEarlyErrors() {
  if (!dsn) return
  onError = (event) => remember(event.error ?? event.message)
  onRejection = (event) => remember(event.reason)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
}

/**
 * Loads the SDK and flushes anything caught in the meantime.
 *
 * Deliberately not awaited by the caller: reporting must never delay the app,
 * and a failure here — an ad blocker, an offline start — is not worth surfacing
 * to a player who only wants to play chess.
 */
export async function startMonitoring() {
  if (!dsn) return

  try {
    // Destructured rather than imported as a namespace: a namespace object
    // forces the bundler to keep every export, which drags in Session Replay
    // and User Feedback — modules this app never uses and that dwarf the rest.
    const { init, captureException } = await import('@sentry/react')

    init({
      dsn,
      environment: import.meta.env.MODE,
      // No IP address, no user identity: the privacy policy promises as much.
      sendDefaultPii: false,
      // Errors only. No tracing, no session replay — both would collect far
      // more than is needed to know that something broke.
      tracesSampleRate: 0,
      // An error the player can do nothing about, from a browser extension or a
      // blocked request, is noise rather than signal.
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
      ],
      beforeSend(event) {
        // Belt and braces: strip anything identifying the SDK may have added.
        delete event.user
        if (event.request) delete event.request.headers
        return event
      },
    })

    for (const reason of pending) captureException(reason)
    pending.length = 0

    if (onError) window.removeEventListener('error', onError)
    if (onRejection) window.removeEventListener('unhandledrejection', onRejection)
    onError = onRejection = null
  } catch {
    // Reporting is optional by design. Losing it must never break the app.
  }
}

/** Reports an error caught by a boundary. No-op when reporting is off. */
export async function reportError(error: unknown) {
  if (!dsn) return
  try {
    const { captureException } = await import('@sentry/react')
    captureException(error)
  } catch {
    // Same reasoning as above.
  }
}

/** Whether reporting is configured, for the privacy notice to stay honest. */
export const isMonitoringEnabled = Boolean(dsn)
