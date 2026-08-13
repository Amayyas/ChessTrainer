import { describe, expect, it } from 'vitest'
import { rowToSnapshot, snapshotKey, snapshotToRow } from '@/features/progression/sync'
import { EMPTY_PROGRESS as EMPTY_PUZZLE_PROGRESS } from '@/features/puzzle/dailySet'
import type { ProgressionRow } from '@/lib/supabase'
import { EMPTY_STATS, type ProgressionSnapshot } from '@/store/useProgressionStore'

function row(overrides: Partial<ProgressionRow> = {}): ProgressionRow {
  return {
    user_id: 'u1',
    xp: 0,
    stats: {},
    unlocked_badges: [],
    hunt_scores: {},
    puzzle_progress: {},
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
      huntScores: {},
      puzzleProgress: EMPTY_PUZZLE_PROGRESS,
    }
    expect(snapshotToRow('u9', snapshot)).toEqual({
      user_id: 'u9',
      xp: 42,
      stats: snapshot.stats,
      unlocked_badges: ['hunter'],
      hunt_scores: {},
      puzzle_progress: EMPTY_PUZZLE_PROGRESS,
    })
  })
})

describe('snapshotKey', () => {
  it('is stable for equal snapshots and independent of the user id', () => {
    const a: ProgressionSnapshot = {
      xp: 1,
      stats: EMPTY_STATS,
      unlockedBadges: [],
      huntScores: {},
      puzzleProgress: EMPTY_PUZZLE_PROGRESS,
    }
    const b: ProgressionSnapshot = {
      xp: 1,
      stats: { ...EMPTY_STATS },
      unlockedBadges: [],
      huntScores: {},
      puzzleProgress: EMPTY_PUZZLE_PROGRESS,
    }
    expect(snapshotKey(a)).toBe(snapshotKey(b))
  })

  it('changes when a synced field changes', () => {
    const base: ProgressionSnapshot = {
      xp: 1,
      stats: EMPTY_STATS,
      unlockedBadges: [],
      huntScores: {},
      puzzleProgress: EMPTY_PUZZLE_PROGRESS,
    }
    expect(snapshotKey({ ...base, xp: 2 })).not.toBe(snapshotKey(base))
  })
})

describe('hunt board and puzzle streak now travel with the account', () => {
  const entry = {
    champion: 'q',
    score: 4860,
    captures: 20,
    playedAt: '2026-08-12T10:00:00Z',
  } as const

  it('reads a stored hunt board back', () => {
    const snapshot = rowToSnapshot(row({ hunt_scores: { q: [entry] } }))
    expect(snapshot.huntScores.q).toEqual([entry])
  })

  it('drops entries that are not shaped like a round', () => {
    const snapshot = rowToSnapshot(
      row({ hunt_scores: { q: [entry, { champion: 'q' }, 'nonsense', null], k: [entry] } }),
    )
    // Only the well-formed round survives, and 'k' is not a playable champion.
    expect(snapshot.huntScores.q).toEqual([entry])
    expect(snapshot.huntScores).not.toHaveProperty('k')
  })

  it('falls back to an empty board on a malformed document', () => {
    expect(rowToSnapshot(row({ hunt_scores: 'oops' })).huntScores).toEqual({})
    expect(rowToSnapshot(row({ hunt_scores: [1, 2] })).huntScores).toEqual({})
  })

  it('reads the puzzle streak back, and repairs a partial one', () => {
    const full = rowToSnapshot(
      row({
        puzzle_progress: { lastSolvedDay: '2026-08-12', streak: 3, bestStreak: 5, totalSolved: 11 },
      }),
    )
    expect(full.puzzleProgress).toEqual({
      lastSolvedDay: '2026-08-12',
      streak: 3,
      bestStreak: 5,
      totalSolved: 11,
    })

    const partial = rowToSnapshot(row({ puzzle_progress: { streak: 2 } }))
    expect(partial.puzzleProgress).toEqual({
      lastSolvedDay: null,
      streak: 2,
      bestStreak: 0,
      totalSolved: 0,
    })
  })

  it('sends both documents up to the server', () => {
    const rowOut = snapshotToRow('u1', {
      xp: 10,
      stats: EMPTY_STATS,
      unlockedBadges: [],
      huntScores: { q: [entry] },
      puzzleProgress: { lastSolvedDay: '2026-08-12', streak: 3, bestStreak: 5, totalSolved: 11 },
    })
    expect(rowOut.hunt_scores).toEqual({ q: [entry] })
    expect(rowOut.puzzle_progress).toMatchObject({ streak: 3, totalSolved: 11 })
  })
})

describe('counts read from an untrusted document', () => {
  it('rejects NaN, Infinity, negatives and fractions in a hunt entry', () => {
    const bad = (over: Record<string, unknown>) => ({
      champion: 'q',
      score: 100,
      captures: 4,
      playedAt: '2026-08-12',
      ...over,
    })
    const board = (entry: unknown) => rowToSnapshot(row({ hunt_scores: { q: [entry] } })).huntScores

    expect(board(bad({ score: Number.NaN }))).toEqual({ q: [] })
    expect(board(bad({ score: Number.POSITIVE_INFINITY }))).toEqual({ q: [] })
    expect(board(bad({ score: -50 }))).toEqual({ q: [] })
    expect(board(bad({ captures: 2.5 }))).toEqual({ q: [] })
    // A well-formed round still gets through.
    expect(board(bad({})).q).toHaveLength(1)
  })

  it('falls back to zero for an unusable puzzle count', () => {
    const read = (over: Record<string, unknown>) =>
      rowToSnapshot(row({ puzzle_progress: over })).puzzleProgress

    expect(read({ streak: Number.NaN }).streak).toBe(0)
    expect(read({ bestStreak: Number.POSITIVE_INFINITY }).bestStreak).toBe(0)
    expect(read({ totalSolved: -3 }).totalSolved).toBe(0)
    expect(read({ totalSolved: 7 }).totalSolved).toBe(7)
  })
})

describe('dates and champion keys in a stored hunt board', () => {
  const round = (over: Record<string, unknown> = {}) => ({
    champion: 'q',
    score: 100,
    captures: 4,
    playedAt: '2026-08-12T10:00:00Z',
    ...over,
  })

  it('drops an entry filed under a champion it does not name', () => {
    // The board is read by key, so a rook round under 'q' would otherwise be
    // shown as a queen record.
    const board = rowToSnapshot(
      row({ hunt_scores: { q: [round({ champion: 'r' }), round()] } }),
    ).huntScores
    expect(board.q).toHaveLength(1)
    expect(board.q?.[0]?.champion).toBe('q')
  })

  it('drops an entry whose date could not be shown', () => {
    const board = (playedAt: unknown) =>
      rowToSnapshot(row({ hunt_scores: { q: [round({ playedAt })] } })).huntScores
    expect(board('pas une date')).toEqual({ q: [] })
    expect(board(20260812)).toEqual({ q: [] })
    expect(board('2026-08-12T10:00:00Z').q).toHaveLength(1)
  })

  it('clears a last solved day that is not a calendar day', () => {
    const read = (lastSolvedDay: unknown) =>
      rowToSnapshot(row({ puzzle_progress: { lastSolvedDay } })).puzzleProgress.lastSolvedDay
    expect(read('hier')).toBeNull()
    expect(read('2026-13-45')).toBeNull()
    expect(read('2026-08-12T10:00:00Z')).toBeNull()
    expect(read('2026-08-12')).toBe('2026-08-12')
  })
})
