/**
 * Weakening below Stockfish's own floor.
 *
 * `UCI_Elo` stops at 1320 and nothing in Stockfish 18 plays weaker (see the
 * header of `levels.ts`). Below it the app does the weakening itself: the engine
 * reports its top few moves (`MultiPV`), and one is drawn with a probability
 * that falls off with what it costs against the best — a softmax over the
 * centipawn loss. A small `temperatureCp` almost always plays the best move; a
 * large one often settles for the second or third, and now and then for a move
 * that drops material, which is what a beginner does.
 *
 * Self-contained on purpose — no `@/` import, only erasable TypeScript — so
 * `scripts/calibrate-levels.mjs` runs this very function under Node's type
 * stripping and the levels are measured with the code that plays them.
 */

/** One `MultiPV` line: its first move and its score, side to move's view. */
export interface Candidate {
  move: string
  scoreCp: number | null
  scoreMate: number | null
}

/** How a level below the engine floor picks its move. */
export interface Weakening {
  /** `MultiPV` asked of the engine: how many moves the draw chooses among. */
  candidates: number
  /** Centipawn loss that divides a move's odds by e. */
  temperatureCp: number
}

/**
 * A forced mate is worth this much and no more. Uncapped, a mate would dwarf
 * every other line and never be missed; a beginner misses them.
 */
export const MATE_CP = 1000

/** A candidate's value in centipawns, mates included, capped at ±MATE_CP. */
export function candidateValue(candidate: Candidate): number {
  if (candidate.scoreMate !== null) {
    // Mate in 0 is the side to move already mated: as bad as a score gets.
    return candidate.scoreMate > 0 ? MATE_CP : -MATE_CP
  }
  return Math.max(-MATE_CP, Math.min(MATE_CP, candidate.scoreCp ?? 0))
}

/**
 * Draws a move from `candidates`, weighting each by `exp(-loss / temperatureCp)`
 * where `loss` is its shortfall against the best candidate. Returns null when
 * there is nothing to draw from. `random` is injectable for tests.
 */
export function pickCandidate(
  candidates: readonly Candidate[],
  temperatureCp: number,
  random: () => number = Math.random,
): string | null {
  if (candidates.length === 0) return null
  const values = candidates.map(candidateValue)
  const best = Math.max(...values)
  const weights = values.map((value) => Math.exp(-(best - value) / temperatureCp))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let draw = random() * total
  for (let i = 0; i < candidates.length; i += 1) {
    draw -= weights[i]!
    if (draw < 0) return candidates[i]!.move
  }
  // Only reached when `random()` returns 1 or rounding leaves a sliver: the
  // last candidate is the one the draw was nearest.
  return candidates.at(-1)!.move
}
