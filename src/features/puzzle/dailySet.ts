import { PUZZLES } from '@/features/puzzle/puzzles'
import type { Puzzle } from '@/features/puzzle/types'

/** Puzzles in a daily series (spec section 2.3). */
export const DAILY_COUNT = 5

/** Local calendar day as YYYY-MM-DD, the key a streak is counted in. */
export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** The calendar day before `key`. */
export function previousDay(key: string): string {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return dayKey(date)
}

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
  day: string = dayKey(),
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

export interface PuzzleProgress {
  /** Last day a puzzle was solved, as YYYY-MM-DD. */
  lastSolvedDay: string | null
  /** Consecutive days with at least one solved puzzle. */
  streak: number
  /** Best streak ever reached. */
  bestStreak: number
  /** Total puzzles solved, all time. */
  totalSolved: number
}

export const EMPTY_PROGRESS: PuzzleProgress = {
  lastSolvedDay: null,
  streak: 0,
  bestStreak: 0,
  totalSolved: 0,
}

/** Records a solved puzzle, extending or restarting the daily streak. */
export function recordSolved(progress: PuzzleProgress, day: string = dayKey()): PuzzleProgress {
  const totalSolved = progress.totalSolved + 1

  // Already counted today: the streak only moves once per day.
  if (progress.lastSolvedDay === day) return { ...progress, totalSolved }

  const streak = progress.lastSolvedDay === previousDay(day) ? progress.streak + 1 : 1
  return {
    lastSolvedDay: day,
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    totalSolved,
  }
}
