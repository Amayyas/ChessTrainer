import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, dayKey, previousDay, recordSolved } from '@/features/puzzle/progress'

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
})
