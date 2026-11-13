import { PUZZLES } from '@/features/puzzle/puzzles'
import { difficultyOf, type Puzzle } from '@/features/puzzle/types'

/** Puzzles in a daily series. */
export const DAILY_COUNT = 5

/**
 * What the daily series draws from: every band but the expert one.
 *
 * The series is the same five for every player, and finishing it is one of the
 * daily challenges. Over the whole pool its top slice would be expert puzzles
 * alone, and every slice below would shift up with it — a harder series for
 * everyone, beginners included, the day the expert band was added. Those
 * puzzles are for a player who goes looking for them in free practice.
 */
export const DAILY_POOL: readonly Puzzle[] = PUZZLES.filter(
  (puzzle) => difficultyOf(puzzle.rating) !== 'expert',
)

/** Small deterministic PRNG, so a given day always yields the same series. */
function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromDay(key: string): number {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) || 1
}

/**
 * The day's series: a stable selection for that date, one puzzle from each of
 * `count` equal rating slices so the set always ramps from easy to hard.
 *
 * A uniform shuffle over the pool could hand a beginner five 2000+
 * puzzles on some days; slicing by rating first rules that out.
 *
 * `seen` (ids already solved, oldest first) is drawn from last: a slice serves
 * an unseen puzzle while it has one, then falls back to the one solved longest
 * ago. The series therefore stays fresh for hundreds of days and only repeats
 * once a whole difficulty band is used up.
 */
export function dailyPuzzles(
  day: string,
  seen: readonly string[] = [],
  pool: readonly Puzzle[] = DAILY_POOL,
  count: number = DAILY_COUNT,
): Puzzle[] {
  const random = mulberry32(seedFromDay(day))
  const byRating = [...pool].sort((a, b) => a.rating - b.rating)
  const slices = Math.min(count, byRating.length)
  const seenAt = new Map(seen.map((id, order) => [id, order]))

  const picked: Puzzle[] = []
  for (let slice = 0; slice < slices; slice += 1) {
    const start = Math.floor((slice * byRating.length) / slices)
    const end = Math.floor(((slice + 1) * byRating.length) / slices)
    const inSlice = byRating.slice(start, end)
    const roll = random()

    const unseen = inSlice.filter((puzzle) => !seenAt.has(puzzle.id))
    if (unseen.length > 0) {
      picked.push(unseen[Math.floor(roll * unseen.length)]!)
    } else {
      // The whole band is used up: replay one of the few solved longest ago,
      // varied by the day so it is not the same puzzle here every morning.
      const byAge = [...inSlice].sort((a, b) => seenAt.get(a.id)! - seenAt.get(b.id)!)
      picked.push(byAge[Math.floor(roll * Math.min(3, byAge.length))]!)
    }
  }
  return picked
}
