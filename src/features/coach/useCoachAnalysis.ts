import { useEffect, useMemo, useRef, useState } from 'react'
import { useStockfish } from '@/engine/useStockfish'
import { parseUciMove } from '@/engine/uci'
import type { UseChessGame } from '@/hooks/useChessGame'
import type { Color, Square } from '@/utils/chess'
import {
  centipawnLoss,
  classifyMove,
  toWhiteEval,
  type MoveQuality,
  type WhiteEval,
} from '@/utils/evaluation'

interface PositionAnalysis {
  eval: WhiteEval
  bestMoveUci: string | null
  pv: string[]
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

  const bestMove = useMemo(() => {
    if (!current?.bestMoveUci) return null
    const parsed = parseUciMove(current.bestMoveUci)
    return parsed ? { from: parsed.from as Square, to: parsed.to as Square } : null
  }, [current])

  const qualities = useMemo(() => {
    return game.history.map((move) => {
      const before = cache.get(move.before)
      const after = cache.get(move.after)
      if (!before || !after) return null
      const loss = centipawnLoss(before.eval, after.eval, move.color)
      return classifyMove(loss, isMissedMate(before.eval, after.eval, move.color))
    })
  }, [game.history, cache])

  return {
    isReady,
    isAnalyzing,
    currentEval: current?.eval ?? null,
    bestMove,
    bestMoveUci: current?.bestMoveUci ?? null,
    qualities,
  }
}
