import { describe, expect, it } from 'vitest'
import {
  bestPerPlayer,
  periodStart,
  type LeaderboardRow,
} from '@/features/leaderboard/useLeaderboard'

const row = (id: number, userId: string, score: number, captures = 0): LeaderboardRow => ({
  id,
  userId,
  username: userId,
  avatarPiece: 'n',
  piece: 'q',
  score,
  captures,
  playedAt: '2026-07-11T10:00:00.000Z',
})

describe('periodStart', () => {
  const now = new Date('2026-07-11T15:30:00')

  it('has no lower bound for all time', () => {
    expect(periodStart('all', now)).toBeNull()
  })

  it('starts today at midnight', () => {
    const start = new Date(periodStart('today', now)!)
    expect(start.getDate()).toBe(11)
    expect(start.getHours()).toBe(0)
  })

  it('covers the last seven days for the week', () => {
    const start = new Date(periodStart('week', now)!)
    expect(start.getDate()).toBe(5)
    expect(start.getHours()).toBe(0)
  })
})

describe('bestPerPlayer', () => {
  it('keeps only each player’s best round', () => {
    const rows = bestPerPlayer([row(1, 'alice', 100), row(2, 'alice', 300), row(3, 'bob', 200)])
    expect(rows.map((r) => r.userId)).toEqual(['alice', 'bob'])
    expect(rows[0]!.score).toBe(300)
  })

  it('sorts by score, then by captures', () => {
    const rows = bestPerPlayer([row(1, 'a', 100, 2), row(2, 'b', 100, 9), row(3, 'c', 150)])
    expect(rows.map((r) => r.userId)).toEqual(['c', 'b', 'a'])
  })

  it('caps the table at the top ten', () => {
    const many = Array.from({ length: 25 }, (_, i) => row(i, `p${i}`, i * 10))
    expect(bestPerPlayer(many)).toHaveLength(10)
  })
})
