import { describe, expect, it } from 'vitest'
import {
  CHALLENGE_POOL,
  DAILY_CHALLENGE_COUNT,
  challengeProgress,
  dailyChallenges,
  emptyCounters,
} from '@/features/progression/challenges'

describe('dailyChallenges', () => {
  it('offers the daily count', () => {
    expect(dailyChallenges('2026-07-11')).toHaveLength(DAILY_CHALLENGE_COUNT)
  })

  it('is stable for a given day but differs the next', () => {
    const a = dailyChallenges('2026-07-11').map((c) => c.id)
    expect(dailyChallenges('2026-07-11').map((c) => c.id)).toEqual(a)
    expect(dailyChallenges('2026-07-12').map((c) => c.id)).not.toEqual(a)
  })

  it('never offers two challenges that read the same counter', () => {
    for (const day of ['2026-07-11', '2026-07-12', '2026-08-01', '2026-12-25']) {
      const metrics = dailyChallenges(day).map((c) => c.id.replace(/-\d+$/, ''))
      expect(new Set(metrics).size).toBe(metrics.length)
    }
  })

  it('only draws from the pool', () => {
    const ids = CHALLENGE_POOL.map((c) => c.id)
    for (const challenge of dailyChallenges('2026-07-11')) {
      expect(ids).toContain(challenge.id)
    }
  })
})

describe('challengeProgress', () => {
  it('reports nothing done on a fresh day', () => {
    const rows = challengeProgress(emptyCounters('2026-07-11'), '2026-07-11')
    expect(rows.every((row) => row.progress === 0 && !row.isComplete)).toBe(true)
  })

  it('caps progress at the target and marks it complete', () => {
    const counters = { ...emptyCounters('2026-07-11'), puzzlesSolved: 99, battleWins: 4 }
    for (const row of challengeProgress(counters, '2026-07-11')) {
      expect(row.progress).toBeLessThanOrEqual(row.challenge.target)
      if (row.challenge.progressOf(counters) >= row.challenge.target) {
        expect(row.isComplete).toBe(true)
      }
    }
  })

  it("ignores yesterday's counters", () => {
    const stale = { ...emptyCounters('2026-07-10'), puzzlesSolved: 50, battleWins: 3 }
    const rows = challengeProgress(stale, '2026-07-11')
    expect(rows.every((row) => row.progress === 0)).toBe(true)
  })
})
