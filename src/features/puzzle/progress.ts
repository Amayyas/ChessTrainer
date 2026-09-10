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
  /**
   * Ids of puzzles already solved, oldest first — the daily series draws from
   * the unseen ones until a difficulty band is used up. Capped so the synced
   * snapshot stays small; the oldest entries fall off first.
   */
  seenPuzzleIds: string[]
  /**
   * The ids picked for `day`'s series, so reopening it that day resumes the same
   * five rather than recomputing against a solved-list that has since grown.
   */
  dailySeries: { day: string; ids: string[] } | null
}

/** How many solved ids to remember. Comfortably above the ~1500-puzzle pool. */
export const SEEN_CAP = 2000

export const EMPTY_PROGRESS: PuzzleProgress = {
  lastSolvedDay: null,
  streak: 0,
  bestStreak: 0,
  totalSolved: 0,
  seenPuzzleIds: [],
  dailySeries: null,
}
// Shared by reference as the initial state, from blankProgress(), and by the
// migrations, so a stray in-place mutation would corrupt all of them.
Object.freeze(EMPTY_PROGRESS)
Object.freeze(EMPTY_PROGRESS.seenPuzzleIds)

/** Appends a solved id, moving a repeat to the end, and trims to `SEEN_CAP`. */
export function markSeen(seen: readonly string[], id: string): string[] {
  const next = seen.filter((other) => other !== id)
  next.push(id)
  return next.length > SEEN_CAP ? next.slice(next.length - SEEN_CAP) : next
}

/**
 * Reconciles two solved-id lists on sign-in: everything either device has seen,
 * server's the older baseline, this device's recent solves appended, capped.
 * The daily series treats a puzzle as seen if it is in *either* list, so a
 * union keeps it from re-serving a puzzle solved on the other device.
 */
export function mergeSeenPuzzleIds(local: readonly string[], server: readonly string[]): string[] {
  const merged: string[] = []
  const present = new Set<string>()
  for (const id of [...server, ...local]) {
    if (present.has(id)) continue
    present.add(id)
    merged.push(id)
  }
  return merged.length > SEEN_CAP ? merged.slice(merged.length - SEEN_CAP) : merged
}

/** Records a solved puzzle, extending or restarting the daily streak. */
export function recordSolved(progress: PuzzleProgress, day: string = dayKey()): PuzzleProgress {
  const totalSolved = progress.totalSolved + 1

  // Already counted today: the streak only moves once per day.
  if (progress.lastSolvedDay === day) return { ...progress, totalSolved }

  const streak = progress.lastSolvedDay === previousDay(day) ? progress.streak + 1 : 1
  return {
    ...progress,
    lastSolvedDay: day,
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    totalSolved,
  }
}
