import type { Analysis } from '@/engine/stockfishEngine'
import type { Color } from '@/utils/chess'

/**
 * Turns a raw Stockfish score into a White-relative evaluation and classifies
 * played moves against fixed centipawn thresholds.
 */

export interface WhiteEval {
  /** Centipawns from White's perspective (positive = White is better). */
  cp: number
  /** Mate distance from White's perspective (positive = White mates), else null. */
  mate: number | null
}

/** A large centipawn stand-in for forced mates, so the eval bar can render them. */
const MATE_CP = 10000

/** Converts an engine analysis (side-to-move relative) to White's perspective. */
export function toWhiteEval(
  analysis: Pick<Analysis, 'scoreCp' | 'scoreMate'>,
  turn: Color,
): WhiteEval {
  const sign = turn === 'w' ? 1 : -1

  if (analysis.scoreMate !== null) {
    const mate = analysis.scoreMate * sign
    return { cp: mate > 0 ? MATE_CP : -MATE_CP, mate }
  }
  return { cp: (analysis.scoreCp ?? 0) * sign, mate: null }
}

/** White's expected score in [0, 1] from a centipawn evaluation (logistic curve). */
export function winningChances(whiteCp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * whiteCp))
}

export type MoveQuality = 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export interface MoveQualityMeta {
  /** Chess annotation symbol shown next to the move. */
  symbol: string
  /** French label for the UI. */
  label: string
  /** Tailwind text colour token. */
  color: string
}

export const MOVE_QUALITY: Record<MoveQuality, MoveQualityMeta> = {
  // Cyan rather than a deeper green: the top two tiers sit next to each other in
  // the move list, and two shades of the same hue would not tell them apart.
  best: { symbol: '!!', label: 'Meilleur coup', color: 'text-cyan-700' },
  excellent: { symbol: '!', label: 'Excellent', color: 'text-emerald-600' },
  good: { symbol: '✓', label: 'Bon coup', color: 'text-ardoise' },
  inaccuracy: { symbol: '?!', label: 'Imprécision', color: 'text-amber-500' },
  mistake: { symbol: '?', label: 'Erreur', color: 'text-orange-600' },
  blunder: { symbol: '??', label: 'Gaffe', color: 'text-red-600' },
}

/**
 * Classifies a played move from how many centipawns it lost against the best
 * move: best 0, excellent ≤10, good ≤30, inaccuracy ≤80,
 * mistake ≤200, blunder beyond — or immediately a blunder if it let a forced
 * mate slip.
 *
 * The top tier is the only one that is not a chosen threshold. Losing nothing
 * at all means the move is the one the engine would have played, or one it
 * rates identically — so it is measured rather than decided, and finding it
 * gets its own mark instead of reading the same as a move ten centipawns off.
 */
export function classifyMove(centipawnLoss: number, missedMate = false): MoveQuality {
  if (missedMate) return 'blunder'
  const loss = Math.max(0, centipawnLoss)
  if (loss === 0) return 'best'
  if (loss <= 10) return 'excellent'
  if (loss <= 30) return 'good'
  if (loss <= 80) return 'inaccuracy'
  if (loss <= 200) return 'mistake'
  return 'blunder'
}

/**
 * Centipawns lost by `mover` when the position went from evalBefore (best play
 * available) to evalAfter (after the move), both White-relative. Never negative.
 */
export function centipawnLoss(evalBefore: WhiteEval, evalAfter: WhiteEval, mover: Color): number {
  const sign = mover === 'w' ? 1 : -1
  const before = evalBefore.cp * sign
  const after = evalAfter.cp * sign
  return Math.max(0, before - after)
}

/** Per-move accuracy in [0, 100] from the shift in winning chances (lichess model). */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const dropInPercent = Math.max(0, (winBefore - winAfter) * 100)
  const accuracy = 103.1668 * Math.exp(-0.04354 * dropInPercent) - 3.1669
  return Math.max(0, Math.min(100, accuracy))
}
