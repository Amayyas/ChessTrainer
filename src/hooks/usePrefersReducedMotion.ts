import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Whether the reader asked their system for less motion, kept current if they
 * change it while the page is open. False on the server, where there is no one
 * to ask: the prerendered landing animates nothing anyway.
 *
 * The one thing that still moves is a piece gliding to its square, and this is
 * what turns that glide off.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
