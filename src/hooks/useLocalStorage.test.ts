import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorage } from '@/hooks/useLocalStorage'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useLocalStorage', () => {
  it('falls back to the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('missing', { n: 1 }))
    expect(result.current[0]).toEqual({ n: 1 })
  })

  it('reads a value already in storage', () => {
    window.localStorage.setItem('seen', JSON.stringify({ n: 7 }))
    const { result } = renderHook(() => useLocalStorage('seen', { n: 1 }))
    expect(result.current[0]).toEqual({ n: 7 })
  })

  it('persists an update, as a value and via an updater function', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => result.current[1](5))
    expect(result.current[0]).toBe(5)
    expect(JSON.parse(window.localStorage.getItem('count')!)).toBe(5)

    act(() => result.current[1]((previous) => previous + 1))
    expect(result.current[0]).toBe(6)
    expect(JSON.parse(window.localStorage.getItem('count')!)).toBe(6)
  })

  it('degrades to the initial value on malformed JSON rather than throwing', () => {
    window.localStorage.setItem('broken', '{not json')
    const { result } = renderHook(() => useLocalStorage('broken', 'safe'))
    expect(result.current[0]).toBe('safe')
  })

  it('keeps the value in memory when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const { result } = renderHook(() => useLocalStorage('quota', 'a'))
    act(() => result.current[1]('b'))
    // The write threw, but the in-memory state still advances.
    expect(result.current[0]).toBe('b')
  })
})
