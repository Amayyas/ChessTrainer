/**
 * Recovery from a dynamic-import chunk that fails to load.
 *
 * That failure is almost always a stale client: a deploy replaced the
 * fingerprinted file in the window between this page loading and the
 * navigation. `React.lazy` caches the rejection and lazyWithRetry's re-attempts
 * hit the same dead URL, so remounting the route — what "Réessayer" does — does
 * not help. Fresh HTML does, so reload once.
 *
 * Vite fires `vite:preloadError` on exactly this. The reload is guarded by a
 * sessionStorage timestamp: a chunk that is genuinely gone (a broken deploy,
 * not a stale client) must reach the error boundary rather than reload forever.
 */

const RELOAD_KEY = 'chesstrainer.chunk-reload-at'
/** A second reload within this window is suppressed — the deploy is the problem, not the client. */
const RELOAD_COOLDOWN_MS = 10_000

function readLastReload(): number {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0
  } catch {
    return 0
  }
}

function markReloaded(): void {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // Private mode or storage disabled: the cooldown is lost, so a hard outage
    // costs one reload loop per navigation rather than none. Acceptable.
  }
}

/** Installs the `vite:preloadError` handler. No-op outside a browser. */
export function installChunkReloadHandler(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', (event) => {
    if (Date.now() - readLastReload() < RELOAD_COOLDOWN_MS) return
    // We are handling this; stop Vite rethrowing it into the boundary.
    event.preventDefault()
    markReloaded()
    window.location.reload()
  })
}
