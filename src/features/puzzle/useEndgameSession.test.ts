import { act, renderHook } from '@testing-library/react'
import { Chess } from 'chess.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Analysis } from '@/engine/stockfishEngine'
import type { Endgame } from '@/features/puzzle/endgames'
import {
  HOLD_LOST_CP,
  HOLD_MOVES,
  PROMOTION_MARGIN_CP,
  WIN_MARGIN_CP,
  judge,
  useEndgameSession,
} from '@/features/puzzle/useEndgameSession'
import { useProgressionStore } from '@/store/useProgressionStore'
import type { Square } from '@/utils/chess'

/** The engine's score, from its own side, for every position it is asked about. */
let engineScore: Pick<Analysis, 'scoreCp' | 'scoreMate'> = { scoreCp: 0, scoreMate: null }

/** A scripted engine: it plays the first legal move, and reports `engineScore`. */
const analyze = vi.fn(async (fen: string): Promise<Analysis | null> => {
  const move = new Chess(fen).moves({ verbose: true })[0]
  return {
    bestMove: move ? `${move.from}${move.to}${move.promotion ?? ''}` : null,
    depth: 12,
    pv: [],
    candidates: [],
    ...engineScore,
  }
})
vi.mock('@/engine/useStockfish', () => ({
  useStockfish: () => ({ isReady: true, isAnalyzing: false, analyze, configureLevel: vi.fn() }),
}))

const endgame = (id: string, goal: Endgame['goal'], fen: string): Endgame => ({
  id,
  title: id,
  goal,
  fen,
  principle: '',
})

type Session = { current: ReturnType<typeof useEndgameSession> }

function play(session: Session, uci: string) {
  act(() => {
    session.current.playerMove(
      uci.slice(0, 2) as Square,
      uci.slice(2, 4) as Square,
      uci[4] as 'q' | undefined,
    )
  })
}

/** Lets the engine think and answer. */
async function engineReplies() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
}

const mastered = () => useProgressionStore.getState().puzzleProgress.endgamesMastered

beforeEach(() => {
  vi.useFakeTimers()
  engineScore = { scoreCp: 0, scoreMate: null }
  analyze.mockClear()
  useProgressionStore.getState().reset()
})
afterEach(() => vi.useRealTimers())

describe('judge', () => {
  it('lets a win stand while the edge holds, and calls it gone below the margin', () => {
    expect(judge('mate', { scoreCp: -(WIN_MARGIN_CP + 50), scoreMate: null }, false)).toBeNull()
    expect(judge('mate', { scoreCp: -(WIN_MARGIN_CP - 50), scoreMate: null }, false)?.won).toBe(
      false,
    )
    // The engine being mated is the player's edge, however the centipawns read.
    expect(judge('mate', { scoreCp: null, scoreMate: -3 }, false)).toBeNull()
  })

  it('wins a promotion only if the edge it leaves is decisive', () => {
    expect(
      judge('promote', { scoreCp: -(PROMOTION_MARGIN_CP + 1), scoreMate: null }, true),
    ).toEqual(expect.objectContaining({ won: true }))
    expect(
      judge('promote', { scoreCp: -(PROMOTION_MARGIN_CP - 1), scoreMate: null }, true),
    ).toEqual(expect.objectContaining({ won: false }))
  })

  it('calls a defence lost once the engine’s edge passes the line, or it can mate', () => {
    expect(judge('hold', { scoreCp: HOLD_LOST_CP - 1, scoreMate: null }, false)).toBeNull()
    expect(judge('hold', { scoreCp: HOLD_LOST_CP, scoreMate: null }, false)?.won).toBe(false)
    expect(judge('hold', { scoreCp: null, scoreMate: 4 }, false)?.won).toBe(false)
  })
})

describe('useEndgameSession', () => {
  it('wins on checkmate and marks the endgame mastered', () => {
    // Qa8 is mate: the king covers g7 and h7, the queen the eighth rank.
    const session = renderHook(() =>
      useEndgameSession(endgame('mat-un', 'mate', '7k/8/6K1/8/8/8/8/Q7 w - - 0 1')),
    ).result
    play(session, 'a1a8')
    expect(session.current.status).toBe('won')
    expect(mastered()).toEqual(['mat-un'])
  })

  it('loses a mate to stalemate, and says so', () => {
    // Qg6 leaves the king no move and no check.
    const session = renderHook(() =>
      useEndgameSession(endgame('pat', 'mate', '7k/5K2/8/8/8/8/8/6Q1 w - - 0 1')),
    ).result
    play(session, 'g1g6')
    expect(session.current.status).toBe('failed')
    expect(session.current.message).toContain('pat')
    expect(mastered()).toEqual([])
  })

  it('calls a win gone when the engine finds the position level', async () => {
    const session = renderHook(() =>
      useEndgameSession(endgame('kqk', 'mate', '8/8/8/4k3/8/8/8/3QK3 w - - 0 1')),
    ).result
    engineScore = { scoreCp: 0, scoreMate: null }
    play(session, 'd1d4')
    await engineReplies()
    expect(session.current.status).toBe('failed')
    expect(session.current.message).toContain('plus gagnante')
  })

  it('plays on while the win stands', async () => {
    const session = renderHook(() =>
      useEndgameSession(endgame('kqk', 'mate', '8/8/8/4k3/8/8/8/3QK3 w - - 0 1')),
    ).result
    engineScore = { scoreCp: null, scoreMate: -9 }
    play(session, 'd1d4')
    await engineReplies()
    expect(session.current.status).toBe('playing')
    expect(session.current.game.turn).toBe('w')
  })

  it('wins a promotion that keeps the queen, and loses one that does not', async () => {
    const fen = '8/4P3/8/8/8/8/k7/4K3 w - - 0 1'
    const kept = renderHook(() => useEndgameSession(endgame('promo', 'promote', fen))).result
    engineScore = { scoreCp: -(PROMOTION_MARGIN_CP + 500), scoreMate: null }
    play(kept, 'e7e8q')
    await engineReplies()
    expect(kept.current.status).toBe('won')

    const lost = renderHook(() => useEndgameSession(endgame('promo-2', 'promote', fen))).result
    engineScore = { scoreCp: 0, scoreMate: null }
    play(lost, 'e7e8q')
    await engineReplies()
    expect(lost.current.status).toBe('failed')
    expect(mastered()).toEqual(['promo'])
  })

  it('holds a defence that lasts its moves, and fails one the engine breaks', async () => {
    // Every move the player makes is a pawn push, which can never repeat a
    // position: the defence is held by lasting its moves, not by a draw.
    const fen = '4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 b - - 0 1'
    const held = renderHook(() => useEndgameSession(endgame('tenir', 'hold', fen))).result
    for (let move = 0; move < HOLD_MOVES; move += 1) {
      const push = new Chess(held.current.game.fen)
        .moves({ verbose: true })
        .find((m) => m.piece === 'p' && !m.captured)!
      play(held, `${push.from}${push.to}`)
      await engineReplies()
    }
    expect(held.current.status).toBe('won')
    expect(held.current.message).toContain('tenus')

    const broken = renderHook(() => useEndgameSession(endgame('ceder', 'hold', fen))).result
    engineScore = { scoreCp: HOLD_LOST_CP + 200, scoreMate: null }
    play(broken, 'a7a6')
    await engineReplies()
    expect(broken.current.status).toBe('failed')
  })

  it('starts the endgame again from its position', async () => {
    const session = renderHook(() =>
      useEndgameSession(endgame('kqk', 'mate', '8/8/8/4k3/8/8/8/3QK3 w - - 0 1')),
    ).result
    play(session, 'd1d4')
    await engineReplies()
    act(() => session.current.restart())
    expect(session.current.game.fen).toBe('8/8/8/4k3/8/8/8/3QK3 w - - 0 1')
    expect(session.current.status).toBe('playing')
    expect(session.current.playerMoves).toBe(0)
  })
})
