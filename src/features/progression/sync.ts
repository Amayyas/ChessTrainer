import type { ProgressionRow } from '@/lib/supabase'
import {
  EMPTY_STATS,
  type ProgressionSnapshot,
  type ProgressionStats,
} from '@/store/useProgressionStore'

/**
 * Pure translation between the progression store and its Supabase row
 * (specification deliverable 5). Kept apart from the effect that talks to the
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

/** The account's server copy, shaped for the store's `hydrate`. */
export function rowToSnapshot(row: ProgressionRow): ProgressionSnapshot {
  return {
    xp: Math.max(0, Math.floor(row.xp) || 0),
    stats: normaliseStats(row.stats),
    unlockedBadges: Array.isArray(row.unlocked_badges) ? row.unlocked_badges : [],
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
  }
}

/** A stable key for a snapshot, used to skip writing back an unchanged copy. */
export function snapshotKey(snapshot: ProgressionSnapshot): string {
  return JSON.stringify(snapshotToRow('', snapshot))
}
