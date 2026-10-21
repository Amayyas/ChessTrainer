import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The hook from a fresh module: it remembers, module-wide, a page settled. */
async function freshHook() {
  vi.resetModules()
  return (await import('@/hooks/useAfterLoad')).useAfterLoad
}

/** An idle callback for the test to run by hand, as Chrome and Firefox have. */
function stubIdle() {
  const pending: Array<() => void> = []
  const request = vi.fn((callback: () => void) => pending.push(callback))
  const cancel = vi.fn()
  Object.defineProperty(window, 'requestIdleCallback', { value: request, configurable: true })
  Object.defineProperty(window, 'cancelIdleCallback', { value: cancel, configurable: true })
  return { request, cancel, runIdle: () => pending.splice(0).forEach((callback) => callback()) }
}

describe('useAfterLoad', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    // Not vi.unstubAllGlobals: that would also take the stand-ins
    // src/test/setup.ts lays down for the whole file.
    delete (window as Partial<Window>).requestIdleCallback
    delete (window as Partial<Window>).cancelIdleCallback
  })

  it('waits for an idle moment of the loaded page, where the browser has one', async () => {
    const useAfterLoad = await freshHook()
    const idle = stubIdle()
    const { result } = renderHook(() => useAfterLoad())
    expect(result.current).toBe(false)
    expect(idle.request).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })
    act(() => idle.runIdle())
    expect(result.current).toBe(true)
  })

  it('lets go of the idle moment it asked for when it unmounts first', async () => {
    const useAfterLoad = await freshHook()
    const idle = stubIdle()
    const { unmount } = renderHook(() => useAfterLoad())
    unmount()
    expect(idle.cancel).toHaveBeenCalledWith(idle.request.mock.results[0]!.value)
  })

  it('waits a moment instead where the browser has no idle callback', async () => {
    // jsdom has none, as Safari.
    const useAfterLoad = await freshHook()
    const { result } = renderHook(() => useAfterLoad())
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(2_000))
    expect(result.current).toBe(true)
  })

  it('waits for the load while the page is still loading', async () => {
    const useAfterLoad = await freshHook()
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('interactive')
    const { result } = renderHook(() => useAfterLoad())
    act(() => vi.advanceTimersByTime(5_000))
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('load'))
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current).toBe(true)
  })

  it('is true at once for a screen shown after the page has settled', async () => {
    // Back on the landing from another screen: nothing is left to wait for.
    const useAfterLoad = await freshHook()
    const first = renderHook(() => useAfterLoad())
    act(() => vi.advanceTimersByTime(2_000))
    expect(first.result.current).toBe(true)
    first.unmount()

    const { result } = renderHook(() => useAfterLoad())
    expect(result.current).toBe(true)
  })
})
