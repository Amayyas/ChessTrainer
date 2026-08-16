import type { HuntScoreEntry, Scoreboard } from '@/features/hunt/scoring'
import { EMPTY_PROGRESS, type PuzzleProgress } from '@/features/puzzle/dailySet'
import type { ProgressionRow } from '@/lib/supabase'
import {
  EMPTY_STATS,
  type ProgressionSnapshot,
  type ProgressionStats,
} from '@/store/useProgressionStore'

/**
 * Pure translation between the progression store and its Supabase row
 * across devices. Kept apart from the effect that talks to the
 * network so the merge rules can be tested on their own.
 */

/** The row's JSON `stats` are untrusted; fold them onto a known-shaped base. */
function normaliseStats(stats: unknown): ProgressionStats {
  if (typeof stats !== 'object' || stats === null) return { ...EMPTY_STATS }
  const merged: ProgressionStats = { ...EMPTY_STATS }
  for (const key of Object.keys(EMPTY_STATS) as (keyof ProgressionStats)[]) {
    const value = (stats as Record<string, unknown>)[key]
    // averageAccuracy is the one nullable field; every other stat is a count.
    if (key === 'averageAccuracy') {
      if (typeof value === 'number') merged.averageAccuracy = value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      merged[key] = value
    }
  }
  return merged
}

/**
 * A count read from an untrusted document. Anything that is not a finite,
 * non-negative whole number is not a count, however much it looks like one:
 * NaN and Infinity are numbers to `typeof`, and both would go on to be
 * displayed and sorted as if they were real scores.
 */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

/** A timestamp the results screen can format; anything else renders as a date error. */
function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

/** A calendar day as the puzzle streak writes it, YYYY-MM-DD. */
function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isTimestamp(value)
}

/** The hunt board is a JSON document too, so it gets the same guarded read. */
const CHAMPIONS = ['q', 'r', 'b', 'n'] as const

/**
 * The entry has to name the champion it is filed under, not merely a valid one:
 * the board is read by key, so a rook round sitting under `q` would be shown as
 * a queen record.
 */
function isHuntEntry(
  value: unknown,
  champion: (typeof CHAMPIONS)[number],
): value is HuntScoreEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    entry.champion === champion &&
    isCount(entry.score) &&
    isCount(entry.captures) &&
    isTimestamp(entry.playedAt)
  )
}

function normaliseHuntScores(value: unknown): Scoreboard {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const board: Scoreboard = {}
  for (const champion of CHAMPIONS) {
    const entries = (value as Record<string, unknown>)[champion]
    if (Array.isArray(entries)) {
      board[champion] = entries.filter((entry): entry is HuntScoreEntry =>
        isHuntEntry(entry, champion),
      )
    }
  }
  return board
}

function normalisePuzzleProgress(value: unknown): PuzzleProgress {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_PROGRESS }
  const raw = value as Record<string, unknown>
  return {
    lastSolvedDay: isDayKey(raw.lastSolvedDay) ? raw.lastSolvedDay : null,
    streak: isCount(raw.streak) ? raw.streak : 0,
    bestStreak: isCount(raw.bestStreak) ? raw.bestStreak : 0,
    totalSolved: isCount(raw.totalSolved) ? raw.totalSolved : 0,
  }
}

/** The account's server copy, shaped for the store's `hydrate`. */
export function rowToSnapshot(row: ProgressionRow): ProgressionSnapshot {
  return {
    xp: Math.max(0, Math.floor(row.xp) || 0),
    stats: normaliseStats(row.stats),
    unlockedBadges: Array.isArray(row.unlocked_badges) ? row.unlocked_badges : [],
    huntScores: normaliseHuntScores(row.hunt_scores),
    puzzleProgress: normalisePuzzleProgress(row.puzzle_progress),
  }
}

/** The current store snapshot, shaped for an upsert into `progression`. */
export function snapshotToRow(
  userId: string,
  snapshot: ProgressionSnapshot,
): Omit<ProgressionRow, 'updated_at'> {
  return {
    user_id: userId,
    xp: snapshot.xp,
    stats: snapshot.stats,
    unlocked_badges: snapshot.unlockedBadges,
    hunt_scores: snapshot.huntScores,
    puzzle_progress: snapshot.puzzleProgress,
  }
}

/** A stable key for a snapshot, used to skip writing back an unchanged copy. */
export function snapshotKey(snapshot: ProgressionSnapshot): string {
  return JSON.stringify(snapshotToRow('', snapshot))
}
