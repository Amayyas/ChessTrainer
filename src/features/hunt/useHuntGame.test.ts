import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHuntGame } from '@/features/hunt/useHuntGame'
import {
  CAPTURE_PENALTY_MS,
  DANGER_GRACE_MS,
  RESPAWN_DELAY_MS,
  ROUND_MS,
  STARTING_LIVES,
} from '@/features/hunt/scoring'

describe('useHuntGame', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts in setup with no champion', () => {
    const { result } = renderHook(() => useHuntGame())
    expect(result.current.phase).toBe('setup')
    expect(result.current.champion).toBeNull()
  })

  it('deals a full round when a champion is chosen', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('q'))

    expect(result.current.phase).toBe('playing')
    expect(result.current.champion).toBe('q')
    expect(result.current.lives).toBe(STARTING_LIVES)
    expect(result.current.timeLeftMs).toBe(ROUND_MS)
    expect(result.current.enemies.size).toBeGreaterThan(0)
    expect(result.current.moves.length).toBeGreaterThan(0)
  })

  it('never starts the champion in danger', () => {
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const { result, unmount } = renderHook(() => useHuntGame())
      act(() => result.current.start('n'))
      expect(result.current.threats).toEqual([])
      unmount()
    }
  })

  it('counts down the clock', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('r'))
    act(() => vi.advanceTimersByTime(3_000))
    expect(result.current.timeLeftMs).toBeLessThanOrEqual(ROUND_MS - 2_900)
  })

  it('refuses a move the champion cannot make', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('r'))

    const illegal = ['a1', 'b2', 'c3', 'e5'].find(
      (square) => !result.current.moves.includes(square),
    )!
    const before = result.current.championSquare
    let applied = true
    act(() => {
      applied = result.current.moveTo(illegal)
    })
    expect(applied).toBe(false)
    expect(result.current.championSquare).toBe(before)
  })

  it('moves the champion and scores a capture', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('q'))

    const target = result.current.moves.find((square) => result.current.enemies.has(square))
    if (!target) return // no enemy reachable on this deal

    const enemiesBefore = result.current.enemies.size
    act(() => {
      result.current.moveTo(target)
    })

    expect(result.current.championSquare).toBe(target)
    expect(result.current.enemies.size).toBe(enemiesBefore - 1)
    expect(result.current.captures).toBe(1)
    expect(result.current.score).toBeGreaterThan(0)
    expect(result.current.combo).toBe(1)
  })

  it('keeps at least three enemies on the board, refilling after a capture', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('q'))
    expect(result.current.enemies.size).toBeGreaterThanOrEqual(3)

    const target = result.current.moves.find((square) => result.current.enemies.has(square))
    if (!target) return // no enemy reachable on this deal

    act(() => {
      result.current.moveTo(target)
    })
    // The captured piece is replaced at once, so there is always prey.
    expect(result.current.enemies.size).toBeGreaterThanOrEqual(3)
    expect(result.current.captures).toBe(1)
  })

  it('moves the enemies around over time', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('n'))
    const before = [...result.current.enemies.keys()].sort().join(',')

    act(() => vi.advanceTimersByTime(5_000))

    const after = [...result.current.enemies.keys()].sort().join(',')
    expect(after).not.toBe(before)
  })

  it('adds enemies over time to keep the pressure up', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('b'))
    const initial = result.current.enemies.size
    act(() => vi.advanceTimersByTime(8_000))
    expect(result.current.enemies.size).toBeGreaterThan(initial)
  })

  it('takes a life and five seconds when the champion stays in danger', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('b'))

    // Let enemies accumulate until the champion is threatened, then wait it out.
    let guard = 0
    while (result.current.threats.length === 0 && guard < 40) {
      act(() => vi.advanceTimersByTime(1_000))
      guard += 1
    }
    if (result.current.threats.length === 0) return // never threatened in this deal

    const livesBefore = result.current.lives
    const timeBefore = result.current.timeLeftMs
    act(() => vi.advanceTimersByTime(DANGER_GRACE_MS + 300))

    expect(result.current.lives).toBe(livesBefore - 1)
    expect(result.current.timeLeftMs).toBeLessThanOrEqual(timeBefore - CAPTURE_PENALTY_MS)
  })

  it('has the threatening enemy take the champion, then respawns it elsewhere', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('b'))

    // Wait until an enemy threatens the champion.
    let guard = 0
    while (result.current.threats.length === 0 && guard < 40) {
      act(() => vi.advanceTimersByTime(1_000))
      guard += 1
    }
    if (result.current.threats.length === 0) return // never threatened in this deal

    const eatenSquare = result.current.championSquare!
    const attacker = result.current.threats[0]!

    // Stay put past the grace period: the attacker moves in and eats it.
    act(() => vi.advanceTimersByTime(DANGER_GRACE_MS + 200))
    expect(result.current.isRespawning).toBe(true)
    expect(result.current.championSquare).toBeNull()
    expect(result.current.enemies.get(eatenSquare)).toBeDefined()
    expect(result.current.enemies.has(attacker)).toBe(false)

    // After the pause the champion is back, somewhere else.
    act(() => vi.advanceTimersByTime(RESPAWN_DELAY_MS + 200))
    expect(result.current.isRespawning).toBe(false)
    expect(result.current.championSquare).not.toBeNull()
    expect(result.current.championSquare).not.toBe(eatenSquare)
  })

  it('ends the round when the clock runs out', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('b'))
    act(() => vi.advanceTimersByTime(ROUND_MS + 500))
    expect(result.current.phase).toBe('over')
  })

  it('goes back to the picker on reset', () => {
    const { result } = renderHook(() => useHuntGame())
    act(() => result.current.start('q'))
    act(() => result.current.reset())
    expect(result.current.phase).toBe('setup')
    expect(result.current.score).toBe(0)
  })
})
