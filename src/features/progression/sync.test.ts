import { describe, expect, it } from 'vitest'
import { rowToSnapshot, snapshotKey, snapshotToRow } from '@/features/progression/sync'
import type { ProgressionRow } from '@/lib/supabase'
import { EMPTY_STATS, type ProgressionSnapshot } from '@/store/useProgressionStore'

function row(overrides: Partial<ProgressionRow> = {}): ProgressionRow {
  return {
    user_id: 'u1',
    xp: 0,
    stats: {},
    unlocked_badges: [],
    updated_at: '2026-07-22T00:00:00Z',
    ...overrides,
  }
}

describe('rowToSnapshot', () => {
  it('folds the JSON stats onto the known shape', () => {
    const snapshot = rowToSnapshot(
      row({ xp: 250, stats: { puzzlesSolved: 4, gamesWon: 2 }, unlocked_badges: ['first-mate'] }),
    )
    expect(snapshot.xp).toBe(250)
    expect(snapshot.stats.puzzlesSolved).toBe(4)
    expect(snapshot.stats.gamesWon).toBe(2)
    // Absent fields fall back to the empty stats rather than undefined.
    expect(snapshot.stats.bestHuntScore).toBe(0)
    expect(snapshot.unlockedBadges).toEqual(['first-mate'])
  })

  it('ignores unknown or malformed fields from an untrusted row', () => {
    const snapshot = rowToSnapshot(
      row({ xp: -5, stats: { puzzlesSolved: 'lots', injected: 99 } as unknown as object }),
    )
    expect(snapshot.xp).toBe(0)
    expect(snapshot.stats.puzzlesSolved).toBe(0)
    expect(snapshot.stats).not.toHaveProperty('injected')
  })

  it('keeps a null averageAccuracy but takes a numeric one', () => {
    expect(
      rowToSnapshot(row({ stats: { averageAccuracy: null } })).stats.averageAccuracy,
    ).toBeNull()
    expect(rowToSnapshot(row({ stats: { averageAccuracy: 82 } })).stats.averageAccuracy).toBe(82)
  })

  it('tolerates non-array badges', () => {
    expect(
      rowToSnapshot(row({ unlocked_badges: null as unknown as string[] })).unlockedBadges,
    ).toEqual([])
  })
})

describe('snapshotToRow', () => {
  it('shapes a snapshot for an upsert under the given user', () => {
    const snapshot: ProgressionSnapshot = {
      xp: 42,
      stats: { ...EMPTY_STATS, huntCaptures: 7 },
      unlockedBadges: ['hunter'],
    }
    expect(snapshotToRow('u9', snapshot)).toEqual({
      user_id: 'u9',
      xp: 42,
      stats: snapshot.stats,
      unlocked_badges: ['hunter'],
    })
  })
})

describe('snapshotKey', () => {
  it('is stable for equal snapshots and independent of the user id', () => {
    const a: ProgressionSnapshot = { xp: 1, stats: EMPTY_STATS, unlockedBadges: [] }
    const b: ProgressionSnapshot = { xp: 1, stats: { ...EMPTY_STATS }, unlockedBadges: [] }
    expect(snapshotKey(a)).toBe(snapshotKey(b))
  })

  it('changes when a synced field changes', () => {
    const base: ProgressionSnapshot = { xp: 1, stats: EMPTY_STATS, unlockedBadges: [] }
    expect(snapshotKey({ ...base, xp: 2 })).not.toBe(snapshotKey(base))
  })
})
