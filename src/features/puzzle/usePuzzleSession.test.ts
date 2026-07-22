import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseUciMove } from '@/engine/uci'
import {
  BASE_POINTS,
  ERROR_COST,
  HINT_COST,
  scorePuzzle,
  usePuzzleSession,
} from '@/features/puzzle/usePuzzleSession'
import type { PieceSymbol, Square } from '@/utils/chess'

describe('scorePuzzle', () => {
  it('awards full points for a flawless solve', () => {
    expect(scorePuzzle(0, 0)).toBe(BASE_POINTS)
  })

  it('charges ten points per hint, as the specification states', () => {
    expect(scorePuzzle(0, 1)).toBe(BASE_POINTS - HINT_COST)
    expect(scorePuzzle(0, 3)).toBe(BASE_POINTS - 3 * HINT_COST)
  })

  it('charges for wrong moves and never goes below zero', () => {
    expect(scorePuzzle(1, 0)).toBe(BASE_POINTS - ERROR_COST)
    expect(scorePuzzle(20, 3)).toBe(0)
  })
})

describe('usePuzzleSession', () => {
  beforeEach(() => window.localStorage.clear())

  it('serves a five-puzzle daily series with the solver to move', () => {
    const { result } = renderHook(() => usePuzzleSession())
    expect(result.current.puzzles).toHaveLength(5)
    expect(result.current.puzzle).not.toBeNull()
    expect(result.current.fen.split(' ')[1]).toBe(result.current.solverColor)
  })

  it('rejects a wrong move, counts the error and leaves the position alone', () => {
    const { result } = renderHook(() => usePuzzleSession())
    const fenBefore = result.current.fen

    // A deliberately wrong move: pick any legal move that is not the solution.
    const expected = parseUciMove(result.current.puzzle!.solution[0]!)!
    const from = expected.from as Square
    const wrongTarget = result.current
      .getLegalTargets(from)
      .find((square) => square !== expected.to)

    if (wrongTarget) {
      act(() => {
        result.current.attempt(from, wrongTarget)
      })
      expect(result.current.errors).toBe(1)
      expect(result.current.feedback).toBe('wrong')
      expect(result.current.fen).toBe(fenBefore)
      expect(result.current.isSolved).toBe(false)
    }
  })

  it('accepts the expected move and advances the position', () => {
    const { result } = renderHook(() => usePuzzleSession())
    const fenBefore = result.current.fen
    const expected = parseUciMove(result.current.puzzle!.solution[0]!)!

    act(() => {
      result.current.attempt(
        expected.from as Square,
        expected.to as Square,
        expected.promotion as PieceSymbol | undefined,
      )
    })

    expect(result.current.feedback).toBe('correct')
    expect(result.current.errors).toBe(0)
    expect(result.current.fen).not.toBe(fenBefore)
  })

  it('solves a one-move puzzle and records the score and streak', () => {
    const { result } = renderHook(() => usePuzzleSession())
    // Walk the whole solution, playing only the solver's plies.
    const solution = result.current.puzzle!.solution

    for (let ply = 0; ply < solution.length; ply += 2) {
      const move = parseUciMove(solution[ply]!)!
      act(() => {
        result.current.attempt(
          move.from as Square,
          move.to as Square,
          move.promotion as PieceSymbol | undefined,
        )
      })
    }

    expect(result.current.isSolved).toBe(true)
    expect(result.current.scores).toHaveLength(1)
    expect(result.current.scores[0]!.points).toBe(BASE_POINTS)
    expect(result.current.progress.streak).toBe(1)
    expect(result.current.progress.totalSolved).toBe(1)
  })

  it('reveals three hints, each costing points', () => {
    const { result } = renderHook(() => usePuzzleSession())
    expect(result.current.hintMessages).toHaveLength(3)

    act(() => result.current.revealHint())
    act(() => result.current.revealHint())
    act(() => result.current.revealHint())
    act(() => result.current.revealHint())

    expect(result.current.hintLevel).toBe(3)
    expect(scorePuzzle(0, result.current.hintLevel)).toBe(BASE_POINTS - 3 * HINT_COST)
  })

  it('moves on to the next puzzle with a clean slate', () => {
    const { result } = renderHook(() => usePuzzleSession())
    const first = result.current.puzzle!.id

    act(() => result.current.next())

    expect(result.current.puzzle!.id).not.toBe(first)
    expect(result.current.errors).toBe(0)
    expect(result.current.hintLevel).toBe(0)
    expect(result.current.isSolved).toBe(false)
  })
})
