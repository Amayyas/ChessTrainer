/**
 * The daily-puzzle streak and its calendar helpers.
 *
 * Kept apart from `dailySet.ts` on purpose: this module is imported by the
 * progression store and its Supabase sync, both of which load at app start.
 * `dailySet.ts` pulls in the whole `PUZZLES` array, and dragging that into the
 * initial bundle through a shared import is exactly what this split avoids.
 */

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
