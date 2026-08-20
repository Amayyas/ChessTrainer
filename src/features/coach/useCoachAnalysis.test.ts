import { renderHook, waitFor } from '@testing-library/react'
import { Chess } from 'chess.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Analysis } from '@/engine/stockfishEngine'
import { useCoachAnalysis } from '@/features/coach/useCoachAnalysis'
import type { UseChessGame } from '@/hooks/useChessGame'

/**
 * These cover the accuracy calculation, which is where both bugs that reached
 * production lived: a summary read before the analysis had finished, and the
 * two colours averaged together. Neither was caught here because none of this
 * file was tested.
 *
 * Stockfish is replaced by a fixture keyed on FEN, so every evaluation is
 * chosen rather than observed and the expected accuracy is arithmetic instead
 * of whatever the engine happened to think that day.
 */

/** White-relative centipawns, plus the best move the engine claims to see. */
interface Entry {
  bestMoveUci: string
  whiteCp: number
}

let fixture = new Map<string, Entry>()
/** FENs whose analysis never resolves, standing in for work still in flight. */
let stalled = new Set<string>()
/** FENs the engine declines outright, returning null rather than an analysis. */
let refused = new Set<string>()
/** How many times each FEN was submitted. */
let calls = new Map<string, number>()

const analyze = vi.fn(async (fen: string): Promise<Analysis | null> => {
  calls.set(fen, (calls.get(fen) ?? 0) + 1)
  if (stalled.has(fen)) return new Promise<never>(() => {})
  if (refused.has(fen)) return null
  const entry = fixture.get(fen) ?? { bestMoveUci: '(none)', whiteCp: 0 }
  // The engine reports from the side to move; the hook converts back.
  const sign = fen.split(' ')[1] === 'b' ? -1 : 1
  return {
    bestMove: entry.bestMoveUci,
    scoreCp: entry.whiteCp * sign,
    scoreMate: null,
    depth: 14,
    pv: [],
  }
})

vi.mock('@/engine/useStockfish', () => ({
  useStockfish: () => ({
    isReady: true,
    isAnalyzing: false,
    analyze: (fen: string) => analyze(fen),
    configureLevel: vi.fn(),
  }),
}))

interface MoveSpec {
  /** The move actually played. */
  san: string
  /** A different legal move, which the fixture declares to be the best one. */
  best: string
  /** White-relative eval of the position the best move reaches. */
  baselineCp: number
  /** White-relative eval of the position the played move reaches. */
  afterCp: number
}

/**
 * Plays the moves and fills the fixture so that every position the hook asks
 * about has an answer — including the "after the best move" baselines each
 * played move is graded against.
 */
function buildGame(specs: MoveSpec[]): { game: UseChessGame; baselines: string[] } {
  const chess = new Chess()
  // The "after the best move" position for each played move, in move order.
  const baselines: string[] = []

  for (const spec of specs) {
    const before = chess.fen()

    const probe = new Chess(before)
    const best = probe.move(spec.best)
    baselines.push(probe.fen())
    fixture.set(probe.fen(), { bestMoveUci: '(none)', whiteCp: spec.baselineCp })

    // `before` is the previous move's `after`, so keep the eval already set for
    // it and only attach the best move the engine claims here.
    fixture.set(before, {
      bestMoveUci: `${best.from}${best.to}`,
      whiteCp: fixture.get(before)?.whiteCp ?? 0,
    })

    chess.move(spec.san)
    fixture.set(chess.fen(), { bestMoveUci: '(none)', whiteCp: spec.afterCp })
  }

  const history = chess.history({ verbose: true })
  return { game: { fen: chess.fen(), history } as UseChessGame, baselines }
}

function renderAnalysis(game: UseChessGame) {
  return renderHook(() => useCoachAnalysis(game, { enabled: true }))
}

beforeEach(() => {
  fixture = new Map()
  stalled = new Set()
  refused = new Set()
  calls = new Map()
  analyze.mockClear()
})

/**
 * White plays two moves that lose nothing; Black answers with a blunder and a
 * mistake. Losses are in centipawns: 300 and 180 against classifyMove's
 * thresholds of 200 (blunder) and 80 (mistake).
 */
const LOPSIDED: MoveSpec[] = [
  { san: 'e4', best: 'd4', baselineCp: 30, afterCp: 30 },
  { san: 'e5', best: 'c5', baselineCp: -50, afterCp: 250 },
  { san: 'Nf3', best: 'd4', baselineCp: 40, afterCp: 40 },
  { san: 'Nc6', best: 'd6', baselineCp: -20, afterCp: 160 },
]

describe('useCoachAnalysis summary', () => {
  it('scores each colour on its own moves', async () => {
    // The bug this covers: the profile averaged the player's moves with
    // Stockfish's, so a game lost to a stronger engine still read well. White
    // gave up nothing here and Black threw the game away twice; one number
    // covering both would describe neither.
    const { result } = renderAnalysis(buildGame(LOPSIDED).game)
    await waitFor(() => expect(result.current.summary.isComplete).toBe(true))

    expect(result.current.summary.accuracyWhite).toBe(100)
    expect(result.current.summary.accuracyBlack).toBeLessThan(50)
  })

  it('measures a loss for Black rather than crediting it as a gain', async () => {
    // Evaluations are White-relative, so Black's mistakes move the number up.
    // Without the sign flip in evalMove, Black's 300cp blunder is read as
    // max(0, -300) = 0 — a perfect move — and the two counters below are the
    // difference between that reading and the right one.
    const { result } = renderAnalysis(buildGame(LOPSIDED).game)
    await waitFor(() => expect(result.current.summary.isComplete).toBe(true))

    expect(result.current.summary.blunders).toBe(1)
    expect(result.current.summary.mistakes).toBe(1)
  })

  it('holds a game with no moves as incomplete', async () => {
    // Otherwise `scored === history.length` is 0 === 0, and an empty game
    // reports itself as a finished analysis worth recording.
    const { result } = renderAnalysis(buildGame([]).game)
    await waitFor(() => expect(analyze).toHaveBeenCalled())

    expect(result.current.summary.isComplete).toBe(false)
  })
})

describe('useCoachAnalysis while the engine is still working', () => {
  it('reports an accuracy it does not yet vouch for', async () => {
    // The bug this covers: the summary was recorded as soon as a number
    // existed. Stockfish walks the game position by position, so an early read
    // is built from the few moves analysed so far — which is how a 78% game was
    // saved as 100%. A number being present is not the signal; isComplete is.
    const { game, baselines } = buildGame(LOPSIDED)
    // The last move's baseline never arrives, so the three before it are graded
    // and it is not. Stalling an earlier one would prove less: the hook analyses
    // one position at a time and each cache write drives the next, so a hung
    // request halts the queue behind it rather than leaving a single hole.
    stalled = new Set([baselines.at(-1)!])

    const { result } = renderAnalysis(game)
    await waitFor(() => expect(result.current.summary.accuracyWhite).not.toBeNull())

    expect(result.current.summary.accuracyBlack).not.toBeNull()
    expect(result.current.summary.isComplete).toBe(false)
  })
})

describe('useCoachAnalysis and checkmate', () => {
  it('scores mate full marks and counts it as analysed', async () => {
    // Mate is the best a position can hold, and the position it leaves has no
    // continuation for the engine to measure against — so it can never receive
    // an evaluation. Left ungraded it would keep isComplete false forever, and
    // every game ending in mate would go unrecorded.
    const foolsMate: MoveSpec[] = [
      { san: 'f3', best: 'e4', baselineCp: 30, afterCp: -40 },
      { san: 'e5', best: 'e6', baselineCp: -30, afterCp: -40 },
      { san: 'g4', best: 'd4', baselineCp: 20, afterCp: -60 },
      { san: 'Qh4#', best: 'd6', baselineCp: -20, afterCp: -10000 },
    ]
    const { result } = renderAnalysis(buildGame(foolsMate).game)
    await waitFor(() => expect(result.current.summary.isComplete).toBe(true))

    // Black's mate scores 100; its other move lost 10cp, which rounds the pair
    // just below full marks rather than to it.
    expect(result.current.summary.accuracyBlack).toBeGreaterThan(90)
    expect(result.current.qualities.at(-1)).toBe('best')
  })
})

describe('useCoachAnalysis when the engine refuses a position', () => {
  it('moves on to the rest of the game instead of stopping there', async () => {
    // The bug this covers: a refusal caches nothing, and clearing the pending
    // set changes no state — so nothing re-ran the effect and the analysis
    // stopped dead on the first refusal. Silently, because a game abandoned
    // half-analysed is indistinguishable from one still being analysed.
    const { game, baselines } = buildGame(LOPSIDED)
    refused = new Set([game.history[0]!.after])

    const { result } = renderAnalysis(game)
    // The last baseline sits far behind the refusal in the queue, so it is only
    // reached if the refusal stopped blocking it.
    await waitFor(() => expect(calls.get(baselines.at(-1)!)).toBeGreaterThan(0))

    // Retried, since a refusal is usually transient — but not without end.
    expect(calls.get(game.history[0]!.after)).toBe(3)
    // The refused move cannot be graded, so the game must not be recorded.
    expect(result.current.summary.isComplete).toBe(false)
  })
})

describe('useCoachAnalysis when the game is replaced', () => {
  it('gives an exhausted position another chance in the next game', async () => {
    // The coach keeps this hook mounted across reset() and loadPgn(), and the
    // starting position belongs to every game. Counts that outlive the game
    // would therefore condemn every later game in the session, long after the
    // engine recovered.
    const first = buildGame(LOPSIDED)
    const start = first.game.history[0]!.before
    refused = new Set([start])

    const { rerender } = renderHook(
      (game: UseChessGame) => useCoachAnalysis(game, { enabled: true }),
      { initialProps: first.game },
    )
    await waitFor(() => expect(calls.get(start)).toBe(3))

    const second = buildGame([
      { san: 'd4', best: 'e4', baselineCp: 20, afterCp: 15 },
      { san: 'd5', best: 'Nf6', baselineCp: -10, afterCp: 25 },
    ])
    rerender(second.game)

    await waitFor(() => expect(calls.get(start)).toBeGreaterThan(3))
  })
})

describe('useCoachAnalysis and the top tier', () => {
  it('awards it to the move the engine chose', async () => {
    const { game } = buildGame([{ san: 'e4', best: 'e4', baselineCp: 30, afterCp: 30 }])
    const { result } = renderAnalysis(game)
    await waitFor(() => expect(result.current.qualities[0]).not.toBeNull())

    expect(result.current.qualities[0]).toBe('best')
  })

  it('withholds it from a different move whose position evaluates higher', async () => {
    // Losses are clamped at zero, so a move the engine did not choose reads as
    // a zero loss whenever its separately searched position comes out ahead of
    // the baseline. A zero loss therefore cannot stand in for "the engine's
    // move" — this one is good, not best.
    const { game } = buildGame([{ san: 'e4', best: 'd4', baselineCp: 10, afterCp: 60 }])
    const { result } = renderAnalysis(game)
    await waitFor(() => expect(result.current.qualities[0]).not.toBeNull())

    expect(result.current.qualities[0]).toBe('excellent')
  })

  it('withholds it from a slower mate than the one the engine saw', async () => {
    // Every forced mate collapses to the same score, so keeping mate in ten
    // scores exactly like finding mate in one. Identifying the chosen move is
    // what keeps the two apart.
    const { game } = buildGame([{ san: 'e4', best: 'd4', baselineCp: 10000, afterCp: 10000 }])
    const { result } = renderAnalysis(game)
    await waitFor(() => expect(result.current.qualities[0]).not.toBeNull())

    expect(result.current.qualities[0]).toBe('excellent')
  })
})
