import { type ComponentType, lazy, type LazyExoticComponent } from 'react'

type PageModule = { default: ComponentType }

/**
 * `React.lazy` that retries the dynamic import before giving up.
 *
 * A route chunk fetch fails for reasons that clear on a second try: a flaky
 * connection, or — the common one — a deploy that replaced the fingerprinted
 * file in the window between this page loading and the navigation. Left to
 * `React.lazy` alone the first failure throws straight to the route boundary;
 * with a retry the transient case recovers on its own and only a real outage
 * reaches the player.
 */
export function lazyWithRetry(
  factory: () => Promise<PageModule>,
  { retries = 2, delayMs = 300 }: { retries?: number; delayMs?: number } = {},
): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await factory()
      } catch (error) {
        lastError = error
        if (attempt < retries) {
          // Back off a little further each time, so a server catching its
          // breath after a deploy gets a moment before the next request.
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
        }
      }
    }
    throw lastError
  })
}
