import { PUZZLES } from '@/features/puzzle/puzzles'
import type { Puzzle } from '@/features/puzzle/types'

/** How long a run lasts. */
export const RUSH_DURATION_MS = 3 * 60 * 1000
/** Wrong moves a run survives: the third one ends it. */
export const RUSH_MAX_STRIKES = 3
/** The rating the first puzzle is drawn around. */
export const RUSH_START_RATING = 700
/** How much harder each puzzle is than the one before, in rating points. */
export const RUSH_RATING_STEP = 70
/**
 * How many of the puzzles nearest the target rating a draw chooses among. One
 * would serve every run the same puzzles; too many would blur the ramp.
 */
const NEAREST = 8

/** The rating the `index`-th puzzle of a run aims at: a steady climb. */
export function rushTarget(index: number): number {
  return RUSH_START_RATING + index * RUSH_RATING_STEP
}

/**
 * The `index`-th puzzle of a run: one of the few nearest its target rating,
 * never one already served in the run. Past the top of the pool the target
 * keeps climbing and the draw keeps taking the hardest left, so a long run
 * stays at the hardest puzzles there are. Null only if the pool is used up.
 */
export function rushPuzzle(
  index: number,
  served: ReadonlySet<string>,
  pool: readonly Puzzle[] = PUZZLES,
  random: () => number = Math.random,
): Puzzle | null {
  const target = rushTarget(index)
  const nearest = pool
    .filter((puzzle) => !served.has(puzzle.id))
    .sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target))
    .slice(0, NEAREST)
  if (nearest.length === 0) return null
  return nearest[Math.floor(random() * nearest.length)]!
}
