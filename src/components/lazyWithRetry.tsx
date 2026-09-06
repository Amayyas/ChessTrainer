import { type ComponentType, lazy, type LazyExoticComponent } from 'react'

type PageModule = { default: ComponentType }

/**
 * `React.lazy` that retries the dynamic import before giving up.
 *
 * This covers a transient failure — a flaky connection, a chunk request that
 * times out — where a second attempt at the same URL succeeds. It does not
 * cover a chunk that is genuinely gone after a deploy: React caches the
 * rejection and the URL stays dead, so the retry loop cannot help. That case
 * is handled separately by the `vite:preloadError` reload in lib/chunkReload,
 * which gets fresh HTML with the new fingerprints.
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
