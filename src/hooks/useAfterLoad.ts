import { startTransition, useEffect, useState } from 'react'

// Once the page has loaded and gone idle it stays so: a screen the router
// shows later has nothing left to wait for.
let settled = false

/**
 * False until the page has loaded and the browser is idle, then true: for
 * what a page can do without at first and should not fetch while what it
 * needs is still arriving. False during the server's render too, so the page
 * is prerendered as it first shows.
 *
 * The change comes as a transition: what it reveals may suspend while its
 * code arrives, and a transition keeps the page as it was until then rather
 * than showing a fallback in its place.
 */
export function useAfterLoad(): boolean {
  const [ready, setReady] = useState(settled)

  useEffect(() => {
    if (settled) return
    let cancel: (() => void) | undefined
    const done = () => {
      // It has run: there is nothing left to cancel.
      cancel = undefined
      settled = true
      startTransition(() => setReady(true))
    }
    const whenIdle = () => {
      // Safari has no idle callback, whatever the DOM's types say: a moment
      // after the load stands in for it.
      const requestIdle = window.requestIdleCallback as Window['requestIdleCallback'] | undefined
      if (requestIdle) {
        const id = requestIdle(done, { timeout: 2000 })
        cancel = () => window.cancelIdleCallback(id)
      } else {
        const id = window.setTimeout(done, 200)
        cancel = () => window.clearTimeout(id)
      }
    }
    if (document.readyState === 'complete') whenIdle()
    else window.addEventListener('load', whenIdle, { once: true })
    return () => {
      window.removeEventListener('load', whenIdle)
      cancel?.()
    }
  }, [])

  return ready
}
