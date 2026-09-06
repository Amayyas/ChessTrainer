import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { installChunkReloadHandler } from '@/lib/chunkReload'

/**
 * A stale route chunk after a deploy: reload once, then stop — a chunk that is
 * still missing after the reload is a broken deploy, and must reach the error
 * boundary rather than reload in a loop.
 */

const reload = vi.fn()

function firePreloadError(): Event {
  const event = new Event('vite:preloadError', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

// Installed once: a fresh listener per test would stack up, since nothing
// removes them. The guard is keyed on sessionStorage, not on the listener.
beforeAll(() => {
  installChunkReloadHandler()
})

beforeEach(() => {
  reload.mockClear()
  window.sessionStorage.clear()
  vi.stubGlobal('location', { ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('installChunkReloadHandler', () => {
  it('reloads once on the first vite:preloadError and suppresses the rethrow', () => {
    const event = firePreloadError()
    expect(reload).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not reload again within the cooldown, and lets the error propagate', () => {
    firePreloadError()
    reload.mockClear()

    const event = firePreloadError()
    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('reloads again once the cooldown has passed', () => {
    firePreloadError()
    reload.mockClear()

    // 11s later — a genuinely new stale-chunk episode, not a loop.
    window.sessionStorage.setItem('chesstrainer.chunk-reload-at', String(Date.now() - 11_000))
    firePreloadError()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('still reloads when sessionStorage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    firePreloadError()
    expect(reload).toHaveBeenCalledOnce()

    getItem.mockRestore()
    setItem.mockRestore()
  })
})
