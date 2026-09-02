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

/**
 * What one move of delay costs when a mate is compared with a mate, and the
 * most that delay can ever cost.
 *
 * A slower mate is still a won game. Nothing was given away, so the penalty is
 * capped inside the "inaccuracy" band and never reaches "mistake" or "blunder":
 * telling a player they blundered a move that still mates by force would be
 * false. Losing the mate altogether is a different event and is already scored
 * as one — a mate traded for +3.00 is a ~9700 cp loss down the ordinary path,
 * which is a blunder, and the two cases stay distinguishable.
 *
 * Against the thresholds below: one move late is "very good", two "good", three
 * and beyond "inaccuracy".
 */
export const SLOWER_MATE_CP = 15
export const SLOWER_MATE_MAX_CP = 80

/** Converts an engine analysis (side-to-move relative) to White's perspective. */
export function toWhiteEval(
  analysis: Pick<Analysis, 'scoreCp' | 'scoreMate'>,
  turn: Color,
): WhiteEval {
  const sign = turn === 'w' ? 1 : -1

  if (analysis.scoreMate !== null) {
    // `mate 0` is the side to move having just been checkmated. Zero carries no
    // sign to say who won, so the score comes from whose turn it is instead:
    // reading it off the mate value swung the bar to the mated side on the last
    // position of every game that ended in mate.
    if (analysis.scoreMate === 0) return { cp: turn === 'w' ? -MATE_CP : MATE_CP, mate: 0 }
    const mate = analysis.scoreMate * sign
    return { cp: mate > 0 ? MATE_CP : -MATE_CP, mate }
  }
  return { cp: (analysis.scoreCp ?? 0) * sign, mate: null }
}

/** White's expected score in [0, 1] from a centipawn evaluation (logistic curve). */
export function winningChances(whiteCp: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * whiteCp))
}

export type MoveQuality =
  'best' | 'excellent' | 'veryGood' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

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
  // Doubling marks the stronger of a pair, as it does for ! and !!, so the two
  // approving tiers read as one family rather than two unrelated glyphs.
  veryGood: { symbol: '✓✓', label: 'Très bon', color: 'text-emerald-500' },
  good: { symbol: '✓', label: 'Bon coup', color: 'text-ardoise' },
  inaccuracy: { symbol: '?!', label: 'Imprécision', color: 'text-amber-500' },
  mistake: { symbol: '?', label: 'Erreur', color: 'text-orange-600' },
  blunder: { symbol: '??', label: 'Gaffe', color: 'text-red-600' },
}

/**
 * Every tier, strongest first.
 *
 * Kept beside the table rather than derived from it: the legend renders in this
 * order, and a tier added to MOVE_QUALITY but forgotten here would simply go
 * unexplained rather than break anything. A test holds the two together.
 */
export const MOVE_QUALITY_ORDER = [
  'best',
  'excellent',
  'veryGood',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
] as const satisfies readonly MoveQuality[]

/**
 * Classifies a played move from how many centipawns it lost against the best
 * move: best 0, excellent ≤10, very good ≤20, good ≤30, inaccuracy ≤80,
 * mistake ≤200, blunder beyond.
 *
 * Never returns 'best'. A zero loss does not identify the engine's own move:
 * losses are clamped at zero, so a different move whose position happens to
 * evaluate higher also reads as zero. The caller compares against the engine's
 * chosen move instead.
 *
 * Feed it {@link centipawnLoss}, which knows what to do when the positions
 * being compared are forced mates rather than centipawn scores.
 */
export function classifyMove(centipawnLoss: number): MoveQuality {
  const loss = Math.max(0, centipawnLoss)
  if (loss <= 10) return 'excellent'
  if (loss <= 20) return 'veryGood'
  if (loss <= 30) return 'good'
  if (loss <= 80) return 'inaccuracy'
  if (loss <= 200) return 'mistake'
  return 'blunder'
}

/**
 * Which way a mate runs for the mover: +1 when they are the one mating, −1 when
 * they are the one being mated.
 *
 * Read from the distance, except at zero — the position where the mate has just
 * landed, and where zero has no sign to carry the answer. The score does, since
 * a mate is always ±MATE_CP.
 */
function mateDirection(mate: number, cp: number, sign: number): number {
  return Math.sign((mate === 0 ? cp : mate) * sign)
}

/**
 * Centipawns lost by `mover` when the position went from evalBefore (best play
 * available) to evalAfter (after the move), both White-relative. Never negative.
 *
 * Mate distance decides when centipawns no longer can. Two mates in the same
 * direction have both been flattened to ±MATE_CP, so their difference is zero
 * however far apart the mates are — which is what used to score mate in ten
 * exactly like mate in one. The distance itself is still on hand, so the delay
 * is priced instead, at {@link SLOWER_MATE_CP} a move up to
 * {@link SLOWER_MATE_MAX_CP}. Mate in one direction only keeps the centipawn
 * comparison, where the ±MATE_CP gap is a real one.
 */
export function centipawnLoss(evalBefore: WhiteEval, evalAfter: WhiteEval, mover: Color): number {
  const sign = mover === 'w' ? 1 : -1

  if (evalBefore.mate !== null && evalAfter.mate !== null) {
    const direction = mateDirection(evalBefore.mate, evalBefore.cp, sign)
    if (direction === mateDirection(evalAfter.mate, evalAfter.cp, sign)) {
      // Distance from the mover's side: positive when they are the one mating,
      // so a bigger number is a slower win; negative when they are being mated,
      // so a smaller one is a quicker defeat. `after - before` is the delay
      // either way — hurrying one's own defeat costs what dawdling over a win
      // costs.
      const before = evalBefore.mate * sign
      const after = evalAfter.mate * sign
      const delay = after - before
      return delay <= 0 ? 0 : Math.min(delay * SLOWER_MATE_CP, SLOWER_MATE_MAX_CP)
    }
  }

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
