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
 * The day's series: a stable selection for that date, ordered from easiest to
 * hardest so the set ramps up.
 */
export function dailyPuzzles(
  day: string,
  pool: readonly Puzzle[] = PUZZLES,
  count: number = DAILY_COUNT,
): Puzzle[] {
  const random = mulberry32(seedFromDay(day))
  const indices = pool.map((_, index) => index)

  // Fisher-Yates with the seeded generator.
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }

  return indices
    .slice(0, Math.min(count, pool.length))
    .map((index) => pool[index]!)
    .sort((a, b) => a.rating - b.rating)
}
