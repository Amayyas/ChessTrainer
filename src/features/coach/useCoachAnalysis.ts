import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseUciMove } from '@/engine/uci'
import { useStockfish } from '@/engine/useStockfish'
import type { UseChessGame } from '@/hooks/useChessGame'
import type { Color, Square } from '@/utils/chess'
import {
  centipawnLoss,
  classifyMove,
  moveAccuracy,
  toWhiteEval,
  winningChances,
  type MoveQuality,
  type WhiteEval,
} from '@/utils/evaluation'

interface PositionAnalysis {
  eval: WhiteEval
  bestMoveUci: string | null
  pv: string[]
}

export interface PositionInsight {
  eval: WhiteEval | null
  bestMove: { from: Square; to: Square } | null
}

export interface GameSummary {
  accuracyWhite: number | null
  accuracyBlack: number | null
  /**
   * Whether every move has been evaluated. Stockfish works through the game
   * position by position, so a summary read too early is built from the handful
   * of moves analysed so far — and reads far better than the game deserved.
   */
  isComplete: boolean
  inaccuracies: number
  mistakes: number
  blunders: number
  bestMove: { san: string; index: number; color: Color } | null
}

export interface CoachAnalysis {
  isReady: boolean
  isAnalyzing: boolean
  currentEval: WhiteEval | null
  bestMove: { from: Square; to: Square } | null
  bestMoveUci: string | null
  qualities: (MoveQuality | null)[]
  summary: GameSummary
  analysisAt: (fen: string) => PositionInsight
}

/**
 * How many times a position is re-submitted after the engine declines it.
 * Refusals are usually transient, so one is worth retrying; a position that
 * fails repeatedly is not worth starving the rest of the game for.
 */
const MAX_REFUSALS = 3

function turnOf(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

/** FEN after playing a UCI move on `fen`, or null if it is not legal. */
function applyUci(fen: string, uci: string): string | null {
  const parsed = parseUciMove(uci)
  if (!parsed) return null
  try {
    const chess = new Chess(fen)
    chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion })
    return chess.fen()
  } catch {
    return null
  }
}

function uciToSquares(uci: string | null): { from: Square; to: Square } | null {
  if (!uci || uci === '(none)') return null
  const parsed = parseUciMove(uci)
  return parsed ? { from: parsed.from as Square, to: parsed.to as Square } : null
}

/**
 * Orchestrates Stockfish analysis for the coach.
 *
 * To classify a move fairly it compares the eval *after the best move* with the
 * eval *after the played move* — both with the opponent to move, so the ~50 cp
 * side-to-move bias between consecutive searches cancels out. That needs, for
 * each position, an extra analysis of the position reached by the best move.
 */
export function useCoachAnalysis(
  game: UseChessGame,
  options: { enabled: boolean; depth?: number },
): CoachAnalysis {
  const { enabled, depth = 14 } = options
  const { isReady, isAnalyzing, analyze } = useStockfish({ enabled, depth })
  const [cache, setCache] = useState<Map<string, PositionAnalysis>>(new Map())
  const pending = useRef(new Set<string>())
  /**
   * Positions the engine declined to analyse, and how many times.
   *
   * State rather than a ref, deliberately: a refusal caches nothing, so if it
   * changed no state the effect below would never run again and the analysis
   * would stop dead on the first one — silently, since a half-analysed game
   * looks the same as one still in progress.
   */
  const [refusals, setRefusals] = useState<Map<string, number>>(new Map())
  const seenHistory = useRef<UseChessGame['history']>([])

  const { fen } = game

  /**
   * Forget the refusals when the board stops being the game we were following.
   *
   * The counts are meant to stop one dead position from starving the others,
   * not to condemn it for the life of the page — and the coach keeps this hook
   * mounted across reset() and loadPgn(). Since the starting position belongs
   * to every game, three refusals there would otherwise leave every later game
   * in the session unanalysable, long after the engine recovered.
   *
   * Cached evaluations are deliberately kept: a position's eval does not depend
   * on the game that reached it, so re-analysing it would be waste.
   */
  useEffect(() => {
    const previous = seenHistory.current
    const isContinuation =
      game.history.length >= previous.length &&
      previous.every((move, index) => game.history[index]?.after === move.after)
    seenHistory.current = game.history
    if (!isContinuation) setRefusals(new Map())
  }, [game.history])

  // For each played move, the FEN reached by the best move in its start position.
  const bestReplyFens = useMemo(() => {
    const map = new Map<string, string>()
    for (const move of game.history) {
      const before = cache.get(move.before)
      if (before?.bestMoveUci && before.bestMoveUci !== '(none)') {
        const replyFen = applyUci(move.before, before.bestMoveUci)
        if (replyFen) map.set(move.before, replyFen)
      }
    }
    return map
  }, [game.history, cache])

  // Every FEN the coach needs evaluated: the live position, each position in the
  // game, and each "after the best move" baseline.
  const desiredFens = useMemo(() => {
    const set = new Set<string>()
    set.add(fen)
    for (const move of game.history) {
      set.add(move.before)
      set.add(move.after)
    }
    for (const replyFen of bestReplyFens.values()) set.add(replyFen)
    return set
  }, [fen, game.history, bestReplyFens])

  // Analyse one missing position per pass; each cache update re-runs this until
  // everything needed is evaluated.
  useEffect(() => {
    if (!enabled || !isReady) return
    let target: string | undefined
    for (const candidate of desiredFens) {
      if (cache.has(candidate) || pending.current.has(candidate)) continue
      // Give up on a position after a few refusals rather than blocking the
      // ones queued behind it. Its move stays ungraded, so the summary stays
      // incomplete and the game is not recorded — which is the honest outcome.
      if ((refusals.get(candidate) ?? 0) >= MAX_REFUSALS) continue
      target = candidate
      break
    }
    if (!target) return

    const fenToAnalyze = target
    pending.current.add(fenToAnalyze)
    let active = true

    analyze(fenToAnalyze).then((result) => {
      pending.current.delete(fenToAnalyze)
      if (!active) return
      if (!result) {
        // Counting the refusal is what lets the queue move on: nothing was
        // cached, so this is the only state change that will re-run the effect.
        setRefusals((previous) => {
          const next = new Map(previous)
          next.set(fenToAnalyze, (previous.get(fenToAnalyze) ?? 0) + 1)
          return next
        })
        return
      }
      setCache((previous) => {
        if (previous.has(fenToAnalyze)) return previous
        const next = new Map(previous)
        next.set(fenToAnalyze, {
          eval: toWhiteEval(result, turnOf(fenToAnalyze)),
          bestMoveUci: result.bestMove,
          pv: result.pv,
        })
        return next
      })
    })

    return () => {
      active = false
    }
  }, [desiredFens, cache, refusals, enabled, isReady, analyze])

  const current = cache.get(fen) ?? null
  const bestMove = useMemo(() => uciToSquares(current?.bestMoveUci ?? null), [current])

  /**
   * Compares the played move with the best move on the same "after move" phase.
   * Returns the centipawns lost and the mover's winning chances before (best
   * reply) and after (played move), or null while the needed evals are missing.
   *
   * The winning chances come from the centipawn scores, which saturate long
   * before ±MATE_CP: a mate reached slowly is graded below the best tier but
   * still measures as 100% accurate. Telling those apart on the accuracy scale
   * needs a different model, not a different constant.
   */
  const evalMove = useCallback(
    (
      move: UseChessGame['history'][number],
    ): { loss: number; winBaseline: number; winAfter: number } | null => {
      const replyFen = bestReplyFens.get(move.before)
      const baseline = replyFen ? cache.get(replyFen) : null
      const after = cache.get(move.after)
      if (!baseline || !after) return null

      // Not the same arithmetic inlined: centipawnLoss also knows what to do
      // when both positions are forced mates, where the centipawn scores are
      // equal and only the distance separates them.
      const loss = centipawnLoss(baseline.eval, after.eval, move.color)
      const toMoverWin = (whiteCp: number) => {
        const white = winningChances(whiteCp)
        return move.color === 'w' ? white : 1 - white
      }
      return {
        loss,
        winBaseline: toMoverWin(baseline.eval.cp),
        winAfter: toMoverWin(after.eval.cp),
      }
    },
    [bestReplyFens, cache],
  )

  const qualities = useMemo(() => {
    return game.history.map((move) => {
      // Mate ends the game; nothing outranks it.
      if (move.san.includes('#')) return 'best'
      // The engine's own move is identified, not inferred from a zero loss.
      // Losses are clamped at zero, so a different move whose position happens
      // to evaluate higher also reads as zero. Only the move the engine
      // actually chose earns the top mark.
      const before = cache.get(move.before)
      const playedUci = `${move.from}${move.to}${move.promotion ?? ''}`
      if (before?.bestMoveUci === playedUci) return 'best'
      const result = evalMove(move)
      return result === null ? null : classifyMove(result.loss)
    })
  }, [game.history, cache, evalMove])

  const summary = useMemo<GameSummary>(() => {
    const whiteAccuracies: number[] = []
    const blackAccuracies: number[] = []
    let inaccuracies = 0
    let mistakes = 0
    let blunders = 0
    let best: GameSummary['bestMove'] = null
    let bestGain = -Infinity
    // Moves that produced an accuracy. Not the same as moves whose positions are
    // cached: scoring a move also needs the line it is measured against, so a
    // position can be evaluated while the move above it still cannot be graded.
    let scored = 0

    game.history.forEach((move, index) => {
      const before = cache.get(move.before)
      const after = cache.get(move.after)

      if (before && after) {
        // Ranking metric for the game's best move: how much the mover improved
        // their winning chances (relative, so the phase bias cancels out).
        const moverWinBefore =
          move.color === 'w' ? winningChances(before.eval.cp) : 1 - winningChances(before.eval.cp)
        const moverWinAfter =
          move.color === 'w' ? winningChances(after.eval.cp) : 1 - winningChances(after.eval.cp)
        const gain = moverWinAfter - moverWinBefore
        if (gain > bestGain) {
          bestGain = gain
          best = { san: move.san, index, color: move.color }
        }
      }

      // Checkmate is the best move a position can hold, so it scores full marks
      // without an evaluation — and could not get one anyway: the position it
      // leaves has no continuation for the engine to measure against.
      if (move.san.includes('#')) {
        scored += 1
        ;(move.color === 'w' ? whiteAccuracies : blackAccuracies).push(100)
        return
      }

      const evaluated = evalMove(move)
      if (!evaluated) return
      scored += 1

      const quality = classifyMove(evaluated.loss)
      if (quality === 'inaccuracy') inaccuracies += 1
      if (quality === 'mistake') mistakes += 1
      if (quality === 'blunder') blunders += 1

      ;(move.color === 'w' ? whiteAccuracies : blackAccuracies).push(
        moveAccuracy(evaluated.winBaseline, evaluated.winAfter),
      )
    })

    const mean = (values: number[]) =>
      values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null

    return {
      accuracyWhite: mean(whiteAccuracies),
      accuracyBlack: mean(blackAccuracies),
      isComplete: game.history.length > 0 && scored === game.history.length,
      inaccuracies,
      mistakes,
      blunders,
      bestMove: best,
    }
  }, [game.history, cache, evalMove])

  const analysisAt = useCallback(
    (targetFen: string): PositionInsight => {
      const entry = cache.get(targetFen)
      return { eval: entry?.eval ?? null, bestMove: uciToSquares(entry?.bestMoveUci ?? null) }
    },
    [cache],
  )

  return {
    isReady,
    isAnalyzing,
    currentEval: current?.eval ?? null,
    bestMove,
    bestMoveUci: current?.bestMoveUci ?? null,
    qualities,
    summary,
    analysisAt,
  }
}
