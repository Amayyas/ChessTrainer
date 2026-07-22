import { beforeEach, describe, expect, it } from 'vitest'
import { XP_REWARDS, huntXp } from '@/features/progression/levels'
import { useProgressionStore } from '@/store/useProgressionStore'

const store = () => useProgressionStore.getState()

describe('useProgressionStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    store().reset()
  })

  it('starts empty', () => {
    expect(store().xp).toBe(0)
    expect(store().stats.gamesPlayed).toBe(0)
    expect(store().activities).toEqual([])
  })

  it('awards XP for a win and records the checkmate', () => {
    store().recordBattle({ outcome: 'win', byCheckmate: true, levelLabel: 'Novice' })

    expect(store().xp).toBe(XP_REWARDS.battleWin)
    expect(store().stats).toMatchObject({ gamesPlayed: 1, gamesWon: 1, checkmatesDelivered: 1 })
    expect(store().activities[0]?.label).toMatch(/Victoire/)
  })

  it('pays a loss less than a win', () => {
    store().recordBattle({ outcome: 'loss', byCheckmate: false, levelLabel: 'Maître' })
    expect(store().xp).toBe(XP_REWARDS.battleLoss)
    expect(store().stats.gamesWon).toBe(0)
  })

  it('pays a bonus for a flawless puzzle', () => {
    store().recordPuzzle({ flawless: true, streak: 3 })
    expect(store().xp).toBe(XP_REWARDS.puzzleSolved + XP_REWARDS.puzzleFlawless)
    expect(store().stats).toMatchObject({
      puzzlesSolved: 1,
      flawlessPuzzles: 1,
      bestPuzzleStreak: 3,
    })
  })

  it('keeps the best hunt score and totals the captures', () => {
    store().recordHunt({ score: 250, captures: 6, championLabel: 'Dame' })
    store().recordHunt({ score: 120, captures: 4, championLabel: 'Dame' })

    expect(store().stats.bestHuntScore).toBe(250)
    expect(store().stats.huntCaptures).toBe(10)
    expect(store().xp).toBe(huntXp(250) + huntXp(120))
  })

  it('averages coach accuracy as a running mean', () => {
    store().recordCoachAnalysis({ accuracy: 80 })
    expect(store().stats.averageAccuracy).toBe(80)

    store().recordCoachAnalysis({ accuracy: 60 })
    expect(store().stats.averageAccuracy).toBe(70)
    expect(store().stats.accuracySamples).toBe(2)
  })

  it('ignores a coach analysis with no accuracy but still pays the XP', () => {
    store().recordCoachAnalysis({ accuracy: null })
    expect(store().stats.averageAccuracy).toBeNull()
    expect(store().xp).toBe(XP_REWARDS.coachGameAnalysed)
  })

  it('keeps the activity feed newest first and bounded', () => {
    for (let i = 0; i < 20; i += 1) {
      store().recordPuzzle({ flawless: false, streak: 1 })
    }
    expect(store().activities.length).toBeLessThanOrEqual(12)
    const times = store().activities.map((activity) => activity.at)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it('unlocks a badge once and queues it for announcement', () => {
    store().unlockBadges(['first-mate'])
    store().unlockBadges(['first-mate'])

    expect(store().unlockedBadges).toEqual(['first-mate'])
    expect(store().pendingBadges).toEqual(['first-mate'])

    store().acknowledgeBadges()
    expect(store().pendingBadges).toEqual([])
    expect(store().unlockedBadges).toEqual(['first-mate'])
  })
})
