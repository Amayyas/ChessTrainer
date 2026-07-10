import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStockfish } from '@/engine/useStockfish'
import { parseUciMove } from '@/engine/uci'
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
  /** Average accuracy in [0, 100] for each colour, or null without enough data. */
  accuracyWhite: number | null
  accuracyBlack: number | null
  inaccuracies: number
  mistakes: number
  blunders: number
  /** Strongest move of the game (biggest jump in the mover's winning chances). */
  bestMove: { san: string; index: number; color: Color } | null
}

export interface CoachAnalysis {
  isReady: boolean
  isAnalyzing: boolean
  /** Evaluation of the current position, White-relative, or null before ready. */
  currentEval: WhiteEval | null
  /** Best move for the current position as board squares, or null. */
  bestMove: { from: Square; to: Square } | null
  bestMoveUci: string | null
  /** Move quality per ply index (parallel to the game's move history). */
  qualities: (MoveQuality | null)[]
  /** End-of-game report (accuracy, mistake counts, best move). */
  summary: GameSummary
  /** Evaluation and best move for any analysed position, e.g. during replay. */
  analysisAt: (fen: string) => PositionInsight
}

/** Reads the side to move straight from a FEN string. */
function turnOf(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

/** Was the mover throwing away a forced mate they already had? */
function isMissedMate(before: WhiteEval, after: WhiteEval, mover: Color): boolean {
  const mateBefore = mover === 'w' ? before.mate : before.mate === null ? null : -before.mate
  const mateAfter = mover === 'w' ? after.mate : after.mate === null ? null : -after.mate
  return mateBefore !== null && mateBefore > 0 && (mateAfter === null || mateAfter <= 0)
}

/**
 * Orchestrates Stockfish analysis for the coach (spec section 2.1). Analyses each
 * position as it appears, caches evaluations by FEN, and derives the current
 * evaluation, the best-move suggestion and a per-move quality classification.
 */
export function useCoachAnalysis(
  game: UseChessGame,
  options: { enabled: boolean; depth?: number },
): CoachAnalysis {
  const { enabled, depth = 15 } = options
  const { isReady, isAnalyzing, analyze } = useStockfish({ enabled, depth })
  const [cache, setCache] = useState<Map<string, PositionAnalysis>>(new Map())
  const pending = useRef(new Set<string>())

  const { fen } = game

  useEffect(() => {
    if (!enabled || !isReady) return
    if (cache.has(fen) || pending.current.has(fen)) return

    pending.current.add(fen)
    let active = true

    analyze(fen).then((result) => {
      pending.current.delete(fen)
      if (!active || !result) return
      const analysis: PositionAnalysis = {
        eval: toWhiteEval(result, turnOf(fen)),
        bestMoveUci: result.bestMove,
        pv: result.pv,
      }
      setCache((previous) => {
        if (previous.has(fen)) return previous
        const next = new Map(previous)
        next.set(fen, analysis)
        return next
      })
    })

    return () => {
      active = false
    }
  }, [fen, enabled, isReady, analyze, cache])

  const current = cache.get(fen) ?? null

  const bestMove = useMemo(() => uciToSquares(current?.bestMoveUci ?? null), [current])

  const qualities = useMemo(() => {
    return game.history.map((move) => {
      // A checkmating move is the best possible outcome; the resulting position
      // is terminal and has no usable engine evaluation to compare against.
      if (move.san.includes('#')) return 'excellent'
      const before = cache.get(move.before)
      const after = cache.get(move.after)
      if (!before || !after) return null
      const loss = centipawnLoss(before.eval, after.eval, move.color)
      return classifyMove(loss, isMissedMate(before.eval, after.eval, move.color))
    })
  }, [game.history, cache])

  const summary = useMemo<GameSummary>(() => {
    const whiteAccuracies: number[] = []
    const blackAccuracies: number[] = []
    let inaccuracies = 0
    let mistakes = 0
    let blunders = 0
    let best: GameSummary['bestMove'] = null
    let bestGain = -Infinity

    game.history.forEach((move, index) => {
      const isMate = move.san.includes('#')
      const before = cache.get(move.before)
      const after = cache.get(move.after)
      if (!isMate && (!before || !after)) return

      const whiteWinBefore = before ? winningChances(before.eval.cp) : 0.5
      const whiteWinAfter = after ? winningChances(after.eval.cp) : 0.5
      const moverBefore = move.color === 'w' ? whiteWinBefore : 1 - whiteWinBefore
      // A checkmating move settles the game in the mover's favour.
      const moverAfter = isMate ? 1 : move.color === 'w' ? whiteWinAfter : 1 - whiteWinAfter

      const accuracy = isMate ? 100 : moveAccuracy(moverBefore, moverAfter)
      ;(move.color === 'w' ? whiteAccuracies : blackAccuracies).push(accuracy)

      const quality =
        isMate || !before || !after
          ? 'excellent'
          : classifyMove(
              centipawnLoss(before.eval, after.eval, move.color),
              isMissedMate(before.eval, after.eval, move.color),
            )
      if (quality === 'inaccuracy') inaccuracies += 1
      if (quality === 'mistake') mistakes += 1
      if (quality === 'blunder') blunders += 1

      const gain = moverAfter - moverBefore
      if (gain > bestGain) {
        bestGain = gain
        best = { san: move.san, index, color: move.color }
      }
    })

    const mean = (values: number[]) =>
      values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null

    return {
      accuracyWhite: mean(whiteAccuracies),
      accuracyBlack: mean(blackAccuracies),
      inaccuracies,
      mistakes,
      blunders,
      bestMove: best,
    }
  }, [game.history, cache])

  const analysisAt = useCallback(
    (targetFen: string): PositionInsight => {
      const entry = cache.get(targetFen)
      return {
        eval: entry?.eval ?? null,
        bestMove: uciToSquares(entry?.bestMoveUci ?? null),
      }
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

/** Converts a UCI move to board squares, or null. */
function uciToSquares(uci: string | null): { from: Square; to: Square } | null {
  if (!uci) return null
  const parsed = parseUciMove(uci)
  return parsed ? { from: parsed.from as Square, to: parsed.to as Square } : null
}
