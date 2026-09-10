import { PUZZLES } from '@/features/puzzle/puzzles'
import type { Puzzle } from '@/features/puzzle/types'

/** Puzzles in a daily series. */
export const DAILY_COUNT = 5

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
 * A uniform shuffle over the 1500-puzzle pool could hand a beginner five 2000+
 * puzzles on some days; slicing by rating first rules that out.
 */
export function dailyPuzzles(
  day: string,
  pool: readonly Puzzle[] = PUZZLES,
  count: number = DAILY_COUNT,
): Puzzle[] {
  const random = mulberry32(seedFromDay(day))
  const byRating = [...pool].sort((a, b) => a.rating - b.rating)
  const slices = Math.min(count, byRating.length)

  const picked: Puzzle[] = []
  for (let slice = 0; slice < slices; slice += 1) {
    const start = Math.floor((slice * byRating.length) / slices)
    const end = Math.floor(((slice + 1) * byRating.length) / slices)
    picked.push(byRating[start + Math.floor(random() * (end - start))]!)
  }
  return picked
}
