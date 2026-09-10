import { describe, expect, it } from 'vitest'
import {
  EMPTY_PROGRESS,
  SEEN_CAP,
  dayKey,
  markSeen,
  mergeSeenPuzzleIds,
  previousDay,
  recordSolved,
} from '@/features/puzzle/progress'

describe('dayKey / previousDay', () => {
  it('formats a local calendar day', () => {
    expect(dayKey(new Date(2026, 6, 11))).toBe('2026-07-11')
  })

  it('steps back a day, including across months', () => {
    expect(previousDay('2026-07-11')).toBe('2026-07-10')
    expect(previousDay('2026-07-01')).toBe('2026-06-30')
    expect(previousDay('2026-01-01')).toBe('2025-12-31')
  })
})

describe('recordSolved', () => {
  it('starts a streak on the first solve', () => {
    const progress = recordSolved(EMPTY_PROGRESS, '2026-07-11')
    expect(progress).toMatchObject({ streak: 1, bestStreak: 1, totalSolved: 1 })
  })

  it('extends the streak the next day', () => {
    const day1 = recordSolved(EMPTY_PROGRESS, '2026-07-10')
    const day2 = recordSolved(day1, '2026-07-11')
    expect(day2.streak).toBe(2)
    expect(day2.bestStreak).toBe(2)
  })

  it('counts a second solve on the same day only once for the streak', () => {
    const first = recordSolved(EMPTY_PROGRESS, '2026-07-11')
    const second = recordSolved(first, '2026-07-11')
    expect(second.streak).toBe(1)
    expect(second.totalSolved).toBe(2)
  })

  it('restarts the streak after a missed day but keeps the best', () => {
    const day1 = recordSolved(EMPTY_PROGRESS, '2026-07-09')
    const day2 = recordSolved(day1, '2026-07-10')
    const later = recordSolved(day2, '2026-07-14')
    expect(later.streak).toBe(1)
    expect(later.bestStreak).toBe(2)
  })

  it('carries the solved-puzzle list through', () => {
    const progress = recordSolved({ ...EMPTY_PROGRESS, seenPuzzleIds: ['ct-0001'] }, '2026-07-11')
    expect(progress.seenPuzzleIds).toEqual(['ct-0001'])
  })
})

describe('markSeen', () => {
  it('appends a new id at the end', () => {
    expect(markSeen(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
  })

  it('moves a repeat to the end rather than duplicating it', () => {
    expect(markSeen(['a', 'b', 'c'], 'b')).toEqual(['a', 'c', 'b'])
  })

  it('drops the oldest ids past the cap', () => {
    const full = Array.from({ length: SEEN_CAP }, (_, i) => `p${i}`)
    const next = markSeen(full, 'newest')
    expect(next).toHaveLength(SEEN_CAP)
    expect(next[0]).toBe('p1')
    expect(next.at(-1)).toBe('newest')
  })
})

describe('mergeSeenPuzzleIds', () => {
  it('keeps every id either side has, without duplicates', () => {
    expect(mergeSeenPuzzleIds(['b', 'c', 'd'], ['a', 'b'])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('caps the result, dropping the oldest', () => {
    const server = Array.from({ length: SEEN_CAP }, (_, i) => `s${i}`)
    const merged = mergeSeenPuzzleIds(['local'], server)
    expect(merged).toHaveLength(SEEN_CAP)
    expect(merged.at(-1)).toBe('local')
  })
})

describe('EMPTY_PROGRESS', () => {
  it('is frozen so it cannot be mutated in place', () => {
    expect(Object.isFrozen(EMPTY_PROGRESS)).toBe(true)
    expect(Object.isFrozen(EMPTY_PROGRESS.seenPuzzleIds)).toBe(true)
  })
})
