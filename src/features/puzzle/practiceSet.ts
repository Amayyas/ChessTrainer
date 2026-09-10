import { PUZZLES } from '@/features/puzzle/puzzles'
import { difficultyOf, type Difficulty } from '@/features/puzzle/types'
import type { Puzzle } from '@/features/puzzle/types'

/**
 * One puzzle for the free practice mode: a random one of the chosen difficulty,
 * an unseen one while the band still has any, and never one already served this
 * session. `null` once the whole band is used up.
 */
export function practicePuzzle(
  difficulty: Difficulty,
  seen: readonly string[],
  servedThisSession: ReadonlySet<string>,
  pool: readonly Puzzle[] = PUZZLES,
): Puzzle | null {
  const band = pool.filter(
    (puzzle) => difficultyOf(puzzle.rating) === difficulty && !servedThisSession.has(puzzle.id),
  )
  if (band.length === 0) return null

  const seenSet = new Set(seen)
  const unseen = band.filter((puzzle) => !seenSet.has(puzzle.id))
  const choices = unseen.length > 0 ? unseen : band
  return choices[Math.floor(Math.random() * choices.length)]!
}
