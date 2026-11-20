import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Analysis } from '@/engine/stockfishEngine'
import {
  ANSWER_MARGIN_CP,
  REVIEW_INTERVALS,
  addDays,
  type MistakePuzzle,
} from '@/features/puzzle/mistakes'
import { dayKey } from '@/features/puzzle/progress'
import { useMistakeSession } from '@/features/puzzle/useMistakeSession'
import { useProgressionStore } from '@/store/useProgressionStore'

/** The engine's score for the position after the answer, from the side to move there. */
let reply: Pick<Analysis, 'scoreCp' | 'scoreMate'> | null = null
const analyze = vi.fn(async () =>
  reply ? { bestMove: null, depth: 14, pv: [], candidates: [], ...reply } : null,
)
vi.mock('@/engine/useStockfish', () => ({
  useStockfish: () => ({ isReady: true, isAnalyzing: false, analyze, configureLevel: vi.fn() }),
}))

// Before 3…Nf6??: Black to move. After the engine's 3…g6 White stood 1.20 better.
const puzzle: MistakePuzzle = {
  id: 'p1',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
  best: 'g7g6',
  bestEval: { cp: 120, mate: null },
  played: 'Nf6',
  createdAt: '2026-11-20T10:00:00.000Z',
  due: dayKey(),
  streak: 0,
}

const stored = () => useProgressionStore.getState().puzzleProgress.mistakes[0]

beforeEach(() => {
  reply = null
  analyze.mockClear()
  useProgressionStore.getState().reset()
  useProgressionStore.getState().setPuzzleProgress((p) => ({ ...p, mistakes: [puzzle] }))
})

describe('useMistakeSession', () => {
  it('takes the engine’s own move at once, and sets the next review further off', () => {
    const { result } = renderHook(() => useMistakeSession(puzzle))
    act(() => {
      result.current.attempt('g7', 'g6')
    })
    expect(result.current.status).toBe('right')
    expect(analyze).not.toHaveBeenCalled()
    expect(stored()).toEqual(
      expect.objectContaining({ streak: 1, due: addDays(dayKey(), REVIEW_INTERVALS[1]) }),
    )
  })

  it('takes another move that costs no more than the margin', async () => {
    // 3…Qe7 guards f7 too. White, to move, is 1.20 + 10 cp better: a 10 cp loss.
    reply = { scoreCp: 120 + ANSWER_MARGIN_CP - 20, scoreMate: null }
    const { result } = renderHook(() => useMistakeSession(puzzle))
    act(() => {
      result.current.attempt('d8', 'e7')
    })
    await waitFor(() => expect(result.current.status).toBe('right'))
    expect(result.current.answer).toBe('Qe7')
  })

  it('turns down a move that still loses, and brings the puzzle back tomorrow', async () => {
    reply = { scoreCp: 120 + ANSWER_MARGIN_CP + 50, scoreMate: null }
    const { result } = renderHook(() => useMistakeSession(puzzle))
    act(() => {
      result.current.attempt('a7', 'a6')
    })
    await waitFor(() => expect(result.current.status).toBe('wrong'))
    expect(stored()).toEqual(expect.objectContaining({ streak: 0, due: addDays(dayKey(), 1) }))
  })

  it('says so when the engine cannot judge, and leaves the schedule alone', async () => {
    const { result } = renderHook(() => useMistakeSession(puzzle))
    act(() => {
      result.current.attempt('a7', 'a6')
    })
    await waitFor(() => expect(result.current.status).toBe('unchecked'))
    expect(stored()).toEqual(puzzle)
  })

  it('takes one answer per puzzle', async () => {
    reply = { scoreCp: 120, scoreMate: null }
    const { result } = renderHook(() => useMistakeSession(puzzle))
    act(() => {
      result.current.attempt('a7', 'a6')
    })
    let second = true
    act(() => {
      second = result.current.attempt('g7', 'g6')
    })
    expect(second).toBe(false)
    await waitFor(() => expect(result.current.status).toBe('right'))
  })
})
