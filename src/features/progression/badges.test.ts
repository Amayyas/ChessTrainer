import { describe, expect, it } from 'vitest'
import { BADGES, badgeById, earnedBadgeIds } from '@/features/progression/badges'
import { EMPTY_STATS, type ProgressionStats } from '@/store/useProgressionStore'

const stats = (overrides: Partial<ProgressionStats> = {}): ProgressionStats => ({
  ...EMPTY_STATS,
  ...overrides,
})

describe('BADGES', () => {
  it('has unique ids and includes the four core badges', () => {
    const ids = BADGES.map((badge) => badge.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(
      expect.arrayContaining(['first-mate', 'streak-7', 'puzzles-100', 'perfect-score']),
    )
  })

  it('earns nothing on a fresh account', () => {
    expect(earnedBadgeIds(stats())).toEqual([])
  })

  it('looks a badge up by id', () => {
    expect(badgeById('first-mate')?.label).toBe('Premier mat')
    expect(badgeById('nope')).toBeUndefined()
  })
})

describe('badge conditions', () => {
  it('awards the first checkmate', () => {
    expect(earnedBadgeIds(stats({ checkmatesDelivered: 1 }))).toContain('first-mate')
  })

  it('awards the seven-day streak only at seven', () => {
    expect(earnedBadgeIds(stats({ bestPuzzleStreak: 6 }))).not.toContain('streak-7')
    expect(earnedBadgeIds(stats({ bestPuzzleStreak: 7 }))).toContain('streak-7')
  })

  it('awards the hundredth puzzle only at a hundred', () => {
    expect(earnedBadgeIds(stats({ puzzlesSolved: 99 }))).not.toContain('puzzles-100')
    expect(earnedBadgeIds(stats({ puzzlesSolved: 100 }))).toContain('puzzles-100')
  })

  it('awards a perfect score for a flawless puzzle', () => {
    expect(earnedBadgeIds(stats({ flawlessPuzzles: 1 }))).toContain('perfect-score')
  })

  it('requires enough analysed games before rewarding accuracy', () => {
    expect(earnedBadgeIds(stats({ battleAccuracy: 95, battleAccuracySamples: 2 }))).not.toContain(
      'precision',
    )
    expect(earnedBadgeIds(stats({ battleAccuracy: 95, battleAccuracySamples: 3 }))).toContain(
      'precision',
    )
  })
})
