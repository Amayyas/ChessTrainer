import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/** A matchMedia whose answer the test controls and can change. */
function stubMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  // A spy rather than a stubbed global: unstubbing every global after each
  // test also took away the ones src/test/setup.ts lays down for the file.
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media: string) =>
      ({
        get matches() {
          return media === '(prefers-reduced-motion: reduce)' ? matches : false
        },
        media,
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  )
  return {
    set(next: boolean) {
      matches = next
      for (const listener of listeners) listener()
    },
  }
}

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the reader’s setting', () => {
    stubMatchMedia(true)
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true)
  })

  it('follows a change made while the page is open', () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)

    act(() => media.set(true))
    expect(result.current).toBe(true)
  })

  it('leaves the stand-ins the test setup lays down in place', () => {
    // Last, on purpose: it reads what the tests before it left behind.
    expect(window.matchMedia).toBeTypeOf('function')
    expect(globalThis.ResizeObserver).toBeTypeOf('function')
  })
})
