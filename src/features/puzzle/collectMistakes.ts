import { Chess, type Move } from 'chess.js'
import {
  REVIEW_INTERVALS,
  addDays,
  positionId,
  type MistakePuzzle,
} from '@/features/puzzle/mistakes'
import type { Square } from '@/utils/chess'
import type { MoveQuality, WhiteEval } from '@/utils/evaluation'

/*
 * Apart from mistakes.ts because it needs chess.js, and mistakes.ts is read by
 * the progression store and its sync at app start, which must not carry it.
 */

/** What the coach knows of a position: its evaluation and the engine's move there. */
export interface Insight {
  eval: WhiteEval | null
  bestMove: { from: Square; to: Square } | null
}

/**
 * The mistakes of a reviewed game, as puzzles due tomorrow: each move graded a
 * mistake or a blunder, by a side in `sides`, for which the coach has the
 * engine's move and the evaluation after it. A move the engine would also
 * have played is not a mistake to learn from, whatever its grade said.
 */
export function collectMistakes(
  moves: readonly Move[],
  qualities: readonly (MoveQuality | null)[],
  insightAt: (fen: string) => Insight,
  sides: ReadonlySet<'w' | 'b'>,
  now: Date,
  today: string,
): MistakePuzzle[] {
  const found: MistakePuzzle[] = []
  moves.forEach((move, index) => {
    const quality = qualities[index]
    if (quality !== 'mistake' && quality !== 'blunder') return
    if (!sides.has(move.color)) return
    const best = insightAt(move.before).bestMove
    if (!best || (best.from === move.from && best.to === move.to)) return

    const board = new Chess(move.before)
    let reached: Move
    try {
      // A pawn the engine takes to the last rank is queened: the coach keeps
      // the squares of its move, not the piece.
      reached = board.move({ from: best.from, to: best.to, promotion: 'q' })
    } catch {
      return
    }
    const bestEval = insightAt(board.fen()).eval
    if (!bestEval) return

    found.push({
      id: positionId(move.before),
      fen: move.before,
      best: `${reached.from}${reached.to}${reached.promotion ?? ''}`,
      bestEval,
      played: move.san,
      createdAt: now.toISOString(),
      due: addDays(today, REVIEW_INTERVALS[0]),
      streak: 0,
    })
  })
  return found
}

/**
 * Whether a puzzle can be set: its position loads and its move is legal there.
 * The list comes back from the server, and a corrupt entry must not reach the
 * board.
 */
export function isPlayable(puzzle: MistakePuzzle): boolean {
  try {
    new Chess(puzzle.fen).move({
      from: puzzle.best.slice(0, 2),
      to: puzzle.best.slice(2, 4),
      promotion: puzzle.best[4],
    })
    return true
  } catch {
    return false
  }
}
