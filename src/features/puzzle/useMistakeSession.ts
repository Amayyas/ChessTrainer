import { Chess } from 'chess.js'
import { useCallback, useState } from 'react'
import { useStockfish } from '@/engine/useStockfish'
import { ANSWER_MARGIN_CP, reviewMistake, type MistakePuzzle } from '@/features/puzzle/mistakes'
import { dayKey } from '@/features/puzzle/progress'
import { useProgressionStore } from '@/store/useProgressionStore'
import type { PieceSymbol, Square } from '@/utils/chess'
import { centipawnLoss, toWhiteEval } from '@/utils/evaluation'

/**
 * The depth the coach analyses at: the answer's evaluation is set against the
 * best move's, which the coach measured at this depth, so the two must agree.
 */
export const ANSWER_DEPTH = 14

export type MistakeStatus = 'solving' | 'checking' | 'right' | 'wrong' | 'unchecked'

export interface UseMistakeSession {
  /** The position on the board: the puzzle's, then the one the answer reached. */
  fen: string
  status: MistakeStatus
  /** The answer played, in English SAN, once there is one. */
  answer: string | null
  isEngineReady: boolean
  attempt: (from: Square, to: Square, promotion?: PieceSymbol) => boolean
  getLegalTargets: (square: Square) => Square[]
  isPromotion: (from: Square, to: Square) => boolean
}

/**
 * One mistake set again. The engine's own move is right at once; any other is
 * searched, and counts if it costs no more than ANSWER_MARGIN_CP against the
 * engine's move — 'good' or better on the coach's scale. A puzzle built from a
 * game has no screened unique solution, and a sound move marked wrong is the
 * one failure a puzzle must never have. The answer reschedules the puzzle.
 */
export function useMistakeSession(puzzle: MistakePuzzle | null): UseMistakeSession {
  const { isReady, analyze } = useStockfish({ enabled: puzzle !== null, depth: ANSWER_DEPTH })
  const setProgress = useProgressionStore((state) => state.setPuzzleProgress)
  const [shown, setShown] = useState(puzzle?.id ?? null)
  const [fen, setFen] = useState(puzzle?.fen ?? new Chess().fen())
  const [status, setStatus] = useState<MistakeStatus>('solving')
  const [answer, setAnswer] = useState<string | null>(null)

  // A new puzzle starts afresh, before it is drawn.
  if ((puzzle?.id ?? null) !== shown) {
    setShown(puzzle?.id ?? null)
    setFen(puzzle?.fen ?? new Chess().fen())
    setStatus('solving')
    setAnswer(null)
  }

  const verdict = useCallback(
    (solved: boolean) => {
      if (!puzzle) return
      setStatus(solved ? 'right' : 'wrong')
      setProgress((progress) => ({
        ...progress,
        mistakes: reviewMistake(progress.mistakes, puzzle.id, solved, dayKey()),
      }))
    },
    [puzzle, setProgress],
  )

  const attempt = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!puzzle || status !== 'solving') return false
      const board = new Chess(puzzle.fen)
      let played
      try {
        played = board.move({ from, to, promotion })
      } catch {
        return false
      }
      setFen(board.fen())
      setAnswer(played.san)

      const uci = `${played.from}${played.to}${played.promotion ?? ''}`
      if (uci === puzzle.best) {
        verdict(true)
        return true
      }

      setStatus('checking')
      void analyze(board.fen(), ANSWER_DEPTH).then((analysis) => {
        // No answer from the engine: say so rather than guess either way.
        if (!analysis) return setStatus('unchecked')
        const reached = toWhiteEval(analysis, board.turn())
        verdict(centipawnLoss(puzzle.bestEval, reached, played.color) <= ANSWER_MARGIN_CP)
      })
      return true
    },
    [puzzle, status, analyze, verdict],
  )

  const getLegalTargets = useCallback(
    (square: Square) =>
      status === 'solving'
        ? [...new Set(new Chess(fen).moves({ square, verbose: true }).map((move) => move.to))]
        : [],
    [fen, status],
  )

  const isPromotion = useCallback(
    (from: Square, to: Square) =>
      new Chess(fen)
        .moves({ square: from, verbose: true })
        .some((move) => move.to === to && Boolean(move.promotion)),
    [fen],
  )

  return { fen, status, answer, isEngineReady: isReady, attempt, getLegalTargets, isPromotion }
}
