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

/**
 * Level names are ours — the longest is "Intermédiaire" — but this value comes
 * back from a JSON column any client could have written. Uncapped, a tampered
 * row would ride along in every future save and in localStorage forever.
 */
export const MAX_LEVEL_LENGTH = 40

/** Newest first, oldest dropped past the limit. */
export function appendEntry(
  history: readonly AccuracyEntry[],
  entry: AccuracyEntry,
): AccuracyEntry[] {
  return sortNewestFirst([entry, ...history])
}

/** Newest first and bounded — the order every reader here depends on. */
export function sortNewestFirst(entries: readonly AccuracyEntry[]): AccuracyEntry[] {
  return [...entries]
    .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, HISTORY_LIMIT)
}

/**
 * Two views of the same log, reconciled.
 *
 * The other synced documents are replaced outright by the server copy, which is
 * right for a total: a second device showing an older XP would double count.
 * A log is not a total. Replacing it drops whatever was appended while the pull
 * was in flight, and the pull then marks the server copy as synchronised — so
 * the entry is not merely hidden, it is never sent at all.
 */
export function mergeHistories(
  local: readonly AccuracyEntry[],
  server: readonly AccuracyEntry[],
): AccuracyEntry[] {
  const seen = new Set<string>()
  const merged: AccuracyEntry[] = []
  for (const entry of [...local, ...server]) {
    // Same instant and same score is the same game seen twice, not two games.
    const key = `${entry.playedAt}|${entry.accuracy}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(entry)
  }
  return sortNewestFirst(merged)
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
