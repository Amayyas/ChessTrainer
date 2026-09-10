import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseUciMove } from '@/engine/uci'
import type { PieceSymbol, Square } from '@/utils/chess'

// A pool with a couple of puzzles per difficulty band, all one-move mates.
const POOL = [
  ['easy-a', 900],
  ['easy-b', 1000],
  ['mid-a', 1400],
  ['mid-b', 1500],
  ['hard-a', 2000],
  ['hard-b', 2100],
].map(([id, rating]) => ({
  id: id as string,
  rating: rating as number,
  fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
  solution: ['h1h8'],
  theme: 'mat-en-1',
  sideToMove: 'w' as const,
}))

vi.mock('@/features/puzzle/puzzles', () => ({ PUZZLES: POOL }))

const { usePracticeSession } = await import('@/features/puzzle/usePracticeSession')
const { useProgressionStore } = await import('@/store/useProgressionStore')

type Result = { current: ReturnType<typeof usePracticeSession> }

const solve = (result: Result) => {
  const move = parseUciMove(result.current.puzzle!.solution[0]!)!
  act(() => {
    result.current.attempt(
      move.from as Square,
      move.to as Square,
      move.promotion as PieceSymbol | undefined,
    )
  })
}

describe('usePracticeSession', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useProgressionStore.getState().reset()
  })

  it('starts on the intermediate band', () => {
    const { result } = renderHook(() => usePracticeSession())
    expect(result.current.difficulty).toBe('intermediaire')
    expect(['mid-a', 'mid-b']).toContain(result.current.puzzle!.id)
  })

  it('counts solves and points, and records XP but not the streak', () => {
    const { result } = renderHook(() => usePracticeSession())
    const solvedId = result.current.puzzle!.id
    solve(result)

    expect(result.current.solved).toBe(1)
    expect(result.current.totalPoints).toBeGreaterThan(0)
    // XP flowed, the daily streak did not.
    expect(useProgressionStore.getState().xp).toBeGreaterThan(0)
    expect(useProgressionStore.getState().puzzleProgress.streak).toBe(0)
    expect(useProgressionStore.getState().puzzleProgress.seenPuzzleIds).toContain(solvedId)
  })

  it('serves a different puzzle on next()', () => {
    const { result } = renderHook(() => usePracticeSession())
    const first = result.current.puzzle!.id
    solve(result)
    act(() => result.current.next())
    expect(result.current.puzzle!.id).not.toBe(first)
    expect(result.current.isSolved).toBe(false)
  })

  it('keeps every puzzle served across band changes, and the tally with it', () => {
    const { result } = renderHook(() => usePracticeSession())
    // Serve both intermediate puzzles.
    solve(result)
    act(() => result.current.next())
    solve(result)
    expect(result.current.solved).toBe(2)

    // A detour through another band must not reset the tally...
    act(() => result.current.setDifficulty('debutant'))
    expect(result.current.solved).toBe(2)
    expect(['easy-a', 'easy-b']).toContain(result.current.puzzle!.id)

    // ...nor forget that the intermediate band is already spent.
    act(() => result.current.setDifficulty('intermediaire'))
    expect(result.current.puzzle).toBeNull()
    expect(result.current.isBandExhausted).toBe(true)
  })

  it('pays out nothing for a puzzle already solved on an earlier day', () => {
    useProgressionStore.getState().setPuzzleProgress((current) => ({
      ...current,
      seenPuzzleIds: ['mid-a', 'mid-b'],
    }))
    const { result } = renderHook(() => usePracticeSession())
    // The band is all seen, so it recycles one of them.
    expect(['mid-a', 'mid-b']).toContain(result.current.puzzle!.id)
    solve(result)

    expect(result.current.solved).toBe(0)
    expect(result.current.totalPoints).toBe(0)
    expect(useProgressionStore.getState().xp).toBe(0)
    expect(useProgressionStore.getState().stats.puzzlesSolved).toBe(0)
  })

  it('pays out nothing when a sign-in folds the puzzle in mid-session', () => {
    const { result } = renderHook(() => usePracticeSession())
    const shown = result.current.puzzle!.id
    // A sync merges the shown puzzle in from another device while open.
    act(() => {
      useProgressionStore.getState().setPuzzleProgress((current) => ({
        ...current,
        seenPuzzleIds: [...current.seenPuzzleIds, shown],
      }))
    })
    solve(result)

    expect(result.current.solved).toBe(0)
    expect(useProgressionStore.getState().xp).toBe(0)
  })

  it('runs out of a band after every puzzle in it is served', () => {
    const { result } = renderHook(() => usePracticeSession())
    act(() => result.current.setDifficulty('avance'))
    // Two puzzles in the band; the first is already served, so one next() more.
    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.puzzle).toBeNull()
    expect(result.current.isBandExhausted).toBe(true)
  })
})
