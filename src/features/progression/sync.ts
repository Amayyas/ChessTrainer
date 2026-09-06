import type { BattleOutcome } from '@/features/battle/useBattleGame'
import type { HuntScoreEntry, Scoreboard } from '@/features/hunt/scoring'
import { emptyCounters, type DailyCounters } from '@/features/progression/challenges'
import {
  MAX_LEVEL_LENGTH,
  sortNewestFirst,
  type AccuracyEntry,
} from '@/features/progression/accuracyHistory'
import { EMPTY_PROGRESS, type PuzzleProgress } from '@/features/puzzle/dailySet'
import type { Json } from '@/lib/database.types'
import type { ProgressionInsert, ProgressionRow } from '@/lib/supabase'
import { ACTIVITY_KINDS, type Activity, type ActivityKind } from '@/store/useProgressionStore'
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
    // battleAccuracy is the one nullable field; every other stat is a count.
    if (key === 'battleAccuracy') {
      if (typeof value === 'number') merged.battleAccuracy = value
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

const OUTCOMES: readonly BattleOutcome[] = ['win', 'loss', 'draw']

/**
 * An accuracy between 0 and 100 that is actually a number: the JSON is
 * untrusted, and a NaN here would be averaged into a chart and rendered as a
 * gap nobody could explain.
 */
function isAccuracy(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function isAccuracyEntry(value: unknown): value is AccuracyEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    isTimestamp(entry.playedAt) &&
    isAccuracy(entry.accuracy) &&
    typeof entry.level === 'string' &&
    entry.level.length <= MAX_LEVEL_LENGTH &&
    OUTCOMES.includes(entry.outcome as BattleOutcome)
  )
}

function normaliseAccuracyHistory(value: unknown): AccuracyEntry[] {
  if (!Array.isArray(value)) return []
  // Sorted as well as trimmed. The trend and the chart both read this newest
  // first, which is what appendEntry produces locally — but a row from an older
  // write, a merge, or a tampered client carries no such guarantee, and an
  // out-of-order array would silently plot and compare the wrong games.
  return sortNewestFirst(value.filter(isAccuracyEntry))
}

/** Counters read from an untrusted document, every field folded onto a known shape. */
function normaliseCounters(value: unknown): DailyCounters {
  const base = emptyCounters()
  if (typeof value !== 'object' || value === null) return base
  const raw = value as Record<string, unknown>
  // The day is what makes the rest meaningful; without a valid one the counters
  // cannot be placed in time, so they are worth nothing and start again.
  if (!isDayKey(raw.day)) return base
  const counters: DailyCounters = { ...base, day: raw.day }
  for (const key of Object.keys(base) as (keyof DailyCounters)[]) {
    if (key === 'day') continue
    const count = raw[key]
    if (isCount(count)) counters[key] = count
  }
  return counters
}

function isActivity(value: unknown): value is Activity {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    entry.id.length <= 64 &&
    ACTIVITY_KINDS.includes(entry.kind as ActivityKind) &&
    typeof entry.label === 'string' &&
    entry.label.length <= 200 &&
    // A real award: whole and not negative. Locally these always are, but this
    // comes back from a column any client can write, and "-50 XP" would be
    // displayed as readily as any other number.
    isCount(entry.xp) &&
    typeof entry.at === 'string' &&
    entry.at.length <= 40 &&
    isTimestamp(entry.at)
  )
}

function normaliseActivities(value: unknown): Activity[] {
  if (!Array.isArray(value)) return []
  // Sorted as well as filtered: the dashboard shows this newest first, and a row
  // from an older write or a merge carries no such guarantee.
  return value
    .filter(isActivity)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, ACTIVITY_FEED_LIMIT)
}

/** Matches the store's own bound; a row must not be able to lift it. */
const ACTIVITY_FEED_LIMIT = 12

/** The account's server copy, shaped for the store's `hydrate`. */
export function rowToSnapshot(row: ProgressionRow): ProgressionSnapshot {
  return {
    xp: Math.max(0, Math.floor(row.xp) || 0),
    stats: normaliseStats(row.stats),
    unlockedBadges: Array.isArray(row.unlocked_badges) ? row.unlocked_badges : [],
    huntScores: normaliseHuntScores(row.hunt_scores),
    puzzleProgress: normalisePuzzleProgress(row.puzzle_progress),
    accuracyHistory: normaliseAccuracyHistory(row.accuracy_history),
    daily: normaliseCounters(row.daily_counters),
    activities: normaliseActivities(row.activity_feed),
  }
}

/**
 * The store's documents are JSON by construction — that is what the six JSON
 * columns on `progression` are for. The generated `Json` type rejects an
 * interface that has no index signature, so the assertion lives here, in the
 * one function that serialises the store to a row, rather than at each field.
 */
const asJson = (document: object): Json => document as unknown as Json

/** The current store snapshot, shaped for an upsert into `progression`. */
export function snapshotToRow(
  userId: string,
  snapshot: ProgressionSnapshot,
): Omit<ProgressionInsert, 'updated_at'> {
  return {
    user_id: userId,
    xp: snapshot.xp,
    unlocked_badges: snapshot.unlockedBadges,
    stats: asJson(snapshot.stats),
    hunt_scores: asJson(snapshot.huntScores),
    puzzle_progress: asJson(snapshot.puzzleProgress),
    accuracy_history: asJson(snapshot.accuracyHistory),
    daily_counters: asJson(snapshot.daily),
    activity_feed: asJson(snapshot.activities),
  }
}

/** A stable key for a snapshot, used to skip writing back an unchanged copy. */
export function snapshotKey(snapshot: ProgressionSnapshot): string {
  return JSON.stringify(snapshotToRow('', snapshot))
}
