import type { BattleOutcome } from '@/features/battle/useBattleGame'

/**
 * One reviewed battle: how accurately the player moved, against whom, and how
 * it ended.
 *
 * A single average says whether you play well; a series says whether you are
 * getting better, which is the only one of the two worth acting on.
 */
export interface AccuracyEntry {
  /** ISO timestamp, so entries sort and format without a second field. */
  playedAt: string
  /** 0–100, the player's own colour only. */
  accuracy: number
  /** The difficulty faced, since 60% against Maître is not 60% against Novice. */
  level: string
  outcome: BattleOutcome
}

/**
 * Kept bounded: the history travels inside a JSON column on every save, so an
 * unbounded list would grow the write until it became the slowest thing the app
 * does. A hundred games is far more than any trend needs.
 */
export const HISTORY_LIMIT = 100

/** Newest first, oldest dropped past the limit. */
export function appendEntry(
  history: readonly AccuracyEntry[],
  entry: AccuracyEntry,
): AccuracyEntry[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT)
}

/**
 * The mean of the last `size` games against the mean of the `size` before them.
 * Null until there are two full windows: a trend drawn from one game and its
 * predecessor is noise wearing the clothes of a measurement.
 */
export function recentTrend(
  history: readonly AccuracyEntry[],
  size = 5,
): { recent: number; previous: number; delta: number } | null {
  if (history.length < size * 2) return null
  const mean = (slice: readonly AccuracyEntry[]) =>
    Math.round(slice.reduce((sum, entry) => sum + entry.accuracy, 0) / slice.length)
  const recent = mean(history.slice(0, size))
  const previous = mean(history.slice(size, size * 2))
  return { recent, previous, delta: recent - previous }
}
