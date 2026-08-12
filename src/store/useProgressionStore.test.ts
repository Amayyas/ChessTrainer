import { beforeEach, describe, expect, it } from 'vitest'
import { XP_REWARDS, huntXp } from '@/features/progression/levels'
import { EMPTY_STATS, useProgressionStore } from '@/store/useProgressionStore'

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

  it('unlocks a badge on its own when a stat crosses the threshold', () => {
    expect(store().unlockedBadges).toEqual([])

    // A win by checkmate earns both the first win and the first mate.
    store().recordBattle({ outcome: 'win', byCheckmate: true, levelLabel: 'Novice' })

    expect(store().unlockedBadges).toEqual(expect.arrayContaining(['first-win', 'first-mate']))
    expect(store().pendingBadges).toEqual(expect.arrayContaining(['first-mate']))
  })

  it('advances the daily counters the challenges read', () => {
    store().recordBattle({ outcome: 'win', byCheckmate: false, levelLabel: 'Novice' })
    store().recordPuzzle({ flawless: false, streak: 1 })
    store().recordHunt({ score: 180, captures: 5, championLabel: 'Dame' })
    store().recordCoachAnalysis({ accuracy: 70 })

    expect(store().daily).toMatchObject({
      battleWins: 1,
      puzzlesSolved: 1,
      huntScore: 180,
      huntCaptures: 5,
      coachAnalyses: 1,
    })
  })

  it('keeps the best hunt score of the day, not the latest', () => {
    store().recordHunt({ score: 200, captures: 4, championLabel: 'Tour' })
    store().recordHunt({ score: 50, captures: 2, championLabel: 'Tour' })
    expect(store().daily.huntScore).toBe(200)
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

describe('adoptOwner — progression must never cross accounts', () => {
  beforeEach(() => {
    window.localStorage.clear()
    store().reset()
  })

  /** Builds some progress and marks it as belonging to `owner`. */
  const progressOwnedBy = (owner: string | null) => {
    store().adoptOwner(owner)
    store().recordPuzzle({ flawless: true, streak: 3 })
    store().recordHunt({ score: 4860, captures: 20, championLabel: 'Tour' })
  }

  it('clears an account progression on sign-out', () => {
    progressOwnedBy('user-a')
    expect(store().xp).toBeGreaterThan(0)

    store().adoptOwner(null)

    // Signing out must leave a guest with nothing of the account behind.
    expect(store().xp).toBe(0)
    expect(store().stats.puzzlesSolved).toBe(0)
    expect(store().stats.bestHuntScore).toBe(0)
    expect(store().unlockedBadges).toEqual([])
    expect(store().activities).toEqual([])
    expect(store().ownerId).toBeNull()
  })

  it('clears one account progression when another signs in', () => {
    progressOwnedBy('user-a')
    const before = store().xp

    store().adoptOwner('user-b')

    expect(before).toBeGreaterThan(0)
    expect(store().xp).toBe(0)
    expect(store().stats.bestHuntScore).toBe(0)
    expect(store().ownerId).toBe('user-b')
  })

  it('keeps guest progress when the account signing in adopts it', () => {
    progressOwnedBy(null)
    const guestXp = store().xp
    const guestBest = store().stats.bestHuntScore

    store().adoptOwner('user-a')

    // A guest's own work follows them into the account they create.
    expect(store().xp).toBe(guestXp)
    expect(store().stats.bestHuntScore).toBe(guestBest)
    expect(store().ownerId).toBe('user-a')
  })

  it('leaves everything untouched when the same account is adopted again', () => {
    progressOwnedBy('user-a')
    const snapshot = { xp: store().xp, activities: store().activities.length }

    // A reload, or a second visit by the same player.
    store().adoptOwner('user-a')

    expect(store().xp).toBe(snapshot.xp)
    expect(store().activities).toHaveLength(snapshot.activities)
  })

  it('adopts only what the guest earned after the previous account left', () => {
    progressOwnedBy('user-a')
    const accountXp = store().xp
    store().adoptOwner(null) // user-a signs out
    store().recordPuzzle({ flawless: false, streak: 1 }) // a guest plays a little
    const guestXp = store().xp

    store().adoptOwner('user-b') // a different player signs in on the device

    // The guest's own work follows them, but user-a's total must be nowhere in
    // it — that is what used to leak into the new account's row.
    expect(guestXp).toBe(XP_REWARDS.puzzleSolved)
    expect(accountXp).toBeGreaterThan(guestXp)
    expect(store().xp).toBe(XP_REWARDS.puzzleSolved)
    expect(store().stats.bestHuntScore).toBe(0)
    expect(store().ownerId).toBe('user-b')
  })
})

describe('persisted storage migration', () => {
  it('drops a pre-ownership record instead of passing it off as guest progress', async () => {
    // What a browser holds from before progression had an owner: real totals,
    // no ownerId. Zustand merges these over the initial state, so without a
    // migration the account's XP would come back looking like a guest's.
    window.localStorage.setItem(
      'chesstrainer.progression',
      JSON.stringify({
        state: {
          xp: 838,
          stats: { ...EMPTY_STATS, puzzlesSolved: 11, bestHuntScore: 4860 },
          daily: { day: '2026-08-12' },
          activities: [{ id: 'a', kind: 'hunt', label: 'Chasse', xp: 3, at: '2026-08-12' }],
          unlockedBadges: ['hunter'],
          pendingBadges: [],
        },
        version: 0,
      }),
    )

    await useProgressionStore.persist.rehydrate()

    expect(store().xp).toBe(0)
    expect(store().stats.puzzlesSolved).toBe(0)
    expect(store().stats.bestHuntScore).toBe(0)
    expect(store().unlockedBadges).toEqual([])
    expect(store().activities).toEqual([])
    expect(store().ownerId).toBeNull()
  })

  it('keeps a record that already carries its owner', async () => {
    window.localStorage.setItem(
      'chesstrainer.progression',
      JSON.stringify({
        state: {
          xp: 250,
          stats: { ...EMPTY_STATS, puzzlesSolved: 4 },
          daily: { day: '2026-08-12' },
          activities: [],
          unlockedBadges: [],
          pendingBadges: [],
          ownerId: 'user-a',
        },
        version: 1,
      }),
    )

    await useProgressionStore.persist.rehydrate()

    expect(store().xp).toBe(250)
    expect(store().ownerId).toBe('user-a')
  })
})
