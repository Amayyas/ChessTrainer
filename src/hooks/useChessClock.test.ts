import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TIME_CONTROLS, formatClock, getTimeControl, useChessClock } from '@/hooks/useChessClock'

describe('TIME_CONTROLS', () => {
  it('matches the specification list', () => {
    expect(TIME_CONTROLS.map((c) => c.label)).toEqual([
      'Bullet (1+0)',
      'Blitz (5+0)',
      'Rapide (10+5)',
      'Sans limite',
    ])
    expect(getTimeControl('rapid')).toMatchObject({ initialMs: 600_000, incrementMs: 5_000 })
    expect(getTimeControl('unlimited').initialMs).toBe(0)
  })
})

describe('formatClock', () => {
  it('shows minutes and seconds above ten seconds', () => {
    expect(formatClock(600_000)).toBe('10:00')
    expect(formatClock(65_000)).toBe('1:05')
  })

  it('shows tenths under ten seconds', () => {
    expect(formatClock(9_400)).toBe('9.4')
  })

  it('never goes negative', () => {
    expect(formatClock(-500)).toBe('0.0')
  })
})

describe('useChessClock', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is disabled without a time limit', () => {
    const { result } = renderHook(() => useChessClock(getTimeControl('unlimited')))
    expect(result.current.enabled).toBe(false)
    act(() => result.current.start('w'))
    act(() => vi.advanceTimersByTime(5_000))
    expect(result.current.active).toBeNull()
  })

  it('counts down the running side only', () => {
    const { result } = renderHook(() => useChessClock(getTimeControl('blitz')))
    act(() => result.current.start('w'))
    act(() => vi.advanceTimersByTime(3_000))

    expect(result.current.whiteMs).toBeLessThanOrEqual(297_100)
    expect(result.current.whiteMs).toBeGreaterThan(296_000)
    expect(result.current.blackMs).toBe(300_000)
  })

  it('adds the increment and hands over on press', () => {
    const { result } = renderHook(() => useChessClock(getTimeControl('rapid')))
    act(() => result.current.start('w'))
    act(() => vi.advanceTimersByTime(2_000))
    act(() => result.current.press('w'))

    // 10:00 minus ~2s plus the 5s increment.
    expect(result.current.whiteMs).toBeGreaterThan(602_000)
    expect(result.current.active).toBe('b')
  })

  it('flags the side that runs out of time', () => {
    const { result } = renderHook(() => useChessClock(getTimeControl('bullet')))
    act(() => result.current.start('w'))
    act(() => vi.advanceTimersByTime(61_000))

    expect(result.current.whiteMs).toBe(0)
    expect(result.current.flagged).toBe('w')
    expect(result.current.active).toBeNull()
  })

  it('resets both clocks', () => {
    const { result } = renderHook(() => useChessClock(getTimeControl('blitz')))
    act(() => result.current.start('w'))
    act(() => vi.advanceTimersByTime(4_000))
    act(() => result.current.reset())

    expect(result.current.whiteMs).toBe(300_000)
    expect(result.current.blackMs).toBe(300_000)
    expect(result.current.active).toBeNull()
  })
})
