import { act, renderHook } from '@testing-library/react'
import { Chess } from 'chess.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Square } from '@/utils/chess'

// A mate-in-1 with two mating moves: the stored line is Qd7#, the player finds
// Ra8#. attempt() must take it, and the board must then show the rook, not the
// canonical queen move.
const TWIN_MATE = {
  id: 'ct-twin',
  fen: '3k4/8/3KQ3/8/8/8/8/R7 w - - 0 1',
  solution: ['e6d7'],
  theme: 'mat-en-1',
  rating: 900,
  sideToMove: 'w' as const,
}
const FILLER = {
  id: 'ct-filler',
  fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
  solution: ['h1h8'],
  theme: 'mat-en-1',
  rating: 1500,
  sideToMove: 'w' as const,
}

vi.mock('@/features/puzzle/puzzles', () => ({ PUZZLES: [TWIN_MATE, FILLER] }))

const { usePuzzleSession } = await import('@/features/puzzle/usePuzzleSession')
const { useProgressionStore } = await import('@/store/useProgressionStore')

describe('usePuzzleSession — alternative mate on the final ply', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useProgressionStore.getState().reset()
  })

  it('accepts a different mating move and shows it on the board', () => {
    const { result } = renderHook(() => usePuzzleSession())
    expect(result.current.puzzle?.id).toBe('ct-twin')

    act(() => {
      result.current.attempt('a1' as Square, 'a8' as Square)
    })

    expect(result.current.feedback).toBe('correct')
    expect(result.current.errors).toBe(0)
    expect(result.current.isSolved).toBe(true)

    // The board carries the rook the player moved, not the stored queen move.
    const board = new Chess(result.current.fen)
    expect(board.get('a8')).toMatchObject({ type: 'r' })
    expect(board.get('d7')).toBeUndefined()
    expect(board.isCheckmate()).toBe(true)
  })

  it('rejects a final move that does not mate', () => {
    const { result } = renderHook(() => usePuzzleSession())
    act(() => {
      result.current.attempt('a1' as Square, 'a7' as Square)
    })
    expect(result.current.feedback).toBe('wrong')
    expect(result.current.errors).toBe(1)
    expect(result.current.isSolved).toBe(false)
  })

  it('drops the substituted move when the series restarts', () => {
    const { result } = renderHook(() => usePuzzleSession())
    act(() => result.current.attempt('a1' as Square, 'a8' as Square))
    act(() => result.current.restart())

    expect(result.current.puzzle?.id).toBe('ct-twin')
    expect(result.current.fen).toBe(TWIN_MATE.fen)
  })
})
