import { describe, expect, it } from 'vitest'
import {
  DAILY_COUNT,
  EMPTY_PROGRESS,
  dailyPuzzles,
  dayKey,
  previousDay,
  recordSolved,
} from '@/features/puzzle/dailySet'
import { PUZZLES } from '@/features/puzzle/puzzles'

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

describe('dailyPuzzles', () => {
  it('returns the daily count', () => {
    expect(dailyPuzzles('2026-07-11')).toHaveLength(DAILY_COUNT)
  })

  it('is stable for a given day', () => {
    const first = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    const second = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    expect(second).toEqual(first)
  })

  it('differs from one day to the next', () => {
    const a = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    const b = dailyPuzzles('2026-07-12').map((puzzle) => puzzle.id)
    expect(b).not.toEqual(a)
  })

  it('ramps up from easiest to hardest', () => {
    const ratings = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.rating)
    expect([...ratings].sort((x, y) => x - y)).toEqual(ratings)
  })

  it('never repeats a puzzle inside a series', () => {
    const ids = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('copes with a pool smaller than the series', () => {
    expect(dailyPuzzles('2026-07-11', PUZZLES.slice(0, 2))).toHaveLength(2)
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
})
