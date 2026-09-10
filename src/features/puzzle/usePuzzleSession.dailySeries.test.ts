import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseUciMove } from '@/engine/uci'
import type { PieceSymbol, Square } from '@/utils/chess'

// Ten one-move mate puzzles spanning the rating range, so the daily series has
// a real pool to slice.
const POOL = Array.from({ length: 10 }, (_, i) => ({
  id: `ct-${String(i + 1).padStart(4, '0')}`,
  fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
  solution: ['h1h8'],
  theme: 'mat-en-1',
  rating: 800 + i * 150,
  sideToMove: 'w' as const,
}))

vi.mock('@/features/puzzle/puzzles', () => ({ PUZZLES: POOL }))

const { usePuzzleSession } = await import('@/features/puzzle/usePuzzleSession')
const { useProgressionStore } = await import('@/store/useProgressionStore')

type Result = { current: ReturnType<typeof usePuzzleSession> }

const solveCurrent = (result: Result) => {
  const move = parseUciMove(result.current.puzzle!.solution[0]!)!
  act(() => {
    result.current.attempt(
      move.from as Square,
      move.to as Square,
      move.promotion as PieceSymbol | undefined,
    )
  })
}

describe('usePuzzleSession — the daily series is fixed for the day', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useProgressionStore.getState().reset()
  })

  it('serves the same five after solving some and reopening', () => {
    const { result: first } = renderHook(() => usePuzzleSession())
    const chosen = first.current.puzzles.map((p) => p.id)
    expect(chosen).toHaveLength(5)

    // Solve the first two of the day.
    solveCurrent(first)
    act(() => first.current.next())
    solveCurrent(first)
    expect(useProgressionStore.getState().puzzleProgress.seenPuzzleIds).toHaveLength(2)

    // A fresh session the same day gets the identical five, not a reshuffle
    // around the two now-solved ones.
    const { result: reopened } = renderHook(() => usePuzzleSession())
    expect(reopened.current.puzzles.map((p) => p.id)).toEqual(chosen)
  })

  it('persists the day series to the store on first open', () => {
    const { result } = renderHook(() => usePuzzleSession())
    const saved = useProgressionStore.getState().puzzleProgress.dailySeries
    expect(saved?.ids).toEqual(result.current.puzzles.map((p) => p.id))
  })
})
