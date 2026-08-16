import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { earnedBadgeIds } from '@/features/progression/badges'
import type { Scoreboard } from '@/features/hunt/scoring'
import { emptyCounters, type DailyCounters } from '@/features/progression/challenges'
import { XP_REWARDS, huntXp, levelFromXp, type LevelProgress } from '@/features/progression/levels'
import { EMPTY_PROGRESS, dayKey, type PuzzleProgress } from '@/features/puzzle/dailySet'

export type ActivityKind = 'battle' | 'puzzle' | 'hunt' | 'coach'

export interface Activity {
  id: string
  kind: ActivityKind
  /** French sentence shown in the dashboard feed. */
  label: string
  xp: number
  at: string
}

export interface ProgressionStats {
  gamesPlayed: number
  gamesWon: number
  /** Average accuracy across analysed games, 0–100, or null before any. */
  averageAccuracy: number | null
  accuracySamples: number
  puzzlesSolved: number
  flawlessPuzzles: number
  bestHuntScore: number
  huntCaptures: number
  checkmatesDelivered: number
  /** Daily puzzle streak mirrored from the puzzle mode. */
  bestPuzzleStreak: number
}

export const EMPTY_STATS: ProgressionStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  averageAccuracy: null,
  accuracySamples: 0,
  puzzlesSolved: 0,
  flawlessPuzzles: 0,
  bestHuntScore: 0,
  huntCaptures: 0,
  checkmatesDelivered: 0,
  bestPuzzleStreak: 0,
}

/** How many recent activities the dashboard keeps. */
const ACTIVITY_LIMIT = 12

export interface BattleOutcomeInput {
  outcome: 'win' | 'loss' | 'draw'
  byCheckmate: boolean
  levelLabel: string
}

/**
 * The part of the progression that follows a signed-in account across devices.
 * The daily counters reset each day and the
 * activity feed and pending-badge animations are local, so none of them belong
 * to the synced snapshot.
 */
export interface ProgressionSnapshot {
  xp: number
  stats: ProgressionStats
  unlockedBadges: string[]
  /** Best rounds per champion, shown on the Piece Hunt picker and results. */
  huntScores: Scoreboard
  /** Daily puzzle streak and totals. */
  puzzleProgress: PuzzleProgress
}

interface ProgressionState {
  xp: number
  stats: ProgressionStats
  daily: DailyCounters
  activities: Activity[]
  unlockedBadges: string[]
  /** Badges unlocked but not yet shown to the player. */
  pendingBadges: string[]
  /**
   * Both of these used to sit in their own localStorage keys, which tied them
   * to the browser rather than to the player: on a shared device one player
   * saw another's records. They live here so they follow the account, and are
   * cleared by the same ownership rules as the rest.
   */
  huntScores: Scoreboard
  puzzleProgress: PuzzleProgress
  /**
   * Whose progression this device currently holds: an account id, or null for
   * a guest. Without it the store cannot tell its own data from the leftovers
   * of whoever used the browser before.
   */
  ownerId: string | null

  recordBattle: (input: BattleOutcomeInput) => void
  recordPuzzle: (input: { flawless: boolean; streak: number }) => void
  recordHunt: (input: { score: number; captures: number; championLabel: string }) => void
  recordCoachAnalysis: (input: { accuracy: number | null }) => void
  unlockBadges: (ids: string[]) => void
  acknowledgeBadges: () => void
  /** Replaces the synced fields with an account's server copy on sign-in. */
  hydrate: (snapshot: ProgressionSnapshot) => void
  setHuntScores: (update: (board: Scoreboard) => Scoreboard) => void
  setPuzzleProgress: (update: (progress: PuzzleProgress) => PuzzleProgress) => void
  /** Points the store at an account, or at the guest with null. */
  adoptOwner: (ownerId: string | null) => void
  reset: () => void
}

/**
 * Removes the pre-account storage keys. Their contents are dropped rather than
 * adopted, so nothing of unknown provenance is carried into an account.
 */
function dropLegacyKeys() {
  try {
    window.localStorage.removeItem('chesstrainer.hunt.scores')
    window.localStorage.removeItem('chesstrainer.puzzle.progress')
  } catch {
    // Storage unavailable: the keys are inert anyway, nothing reads them now.
  }
}

/** Every progression field at its starting value, ownership aside. */
function blankProgress() {
  return {
    xp: 0,
    stats: EMPTY_STATS,
    daily: emptyCounters(),
    activities: [] as Activity[],
    unlockedBadges: [] as string[],
    pendingBadges: [] as string[],
    huntScores: {} as Scoreboard,
    puzzleProgress: EMPTY_PROGRESS,
  }
}

let activitySeq = 0
function activityId(): string {
  activitySeq += 1
  return `${Date.now().toString(36)}-${activitySeq}`
}

/**
 * Global progression. This is the first genuinely global,
 * persistent state in the app — XP is fed by all four modes and read by the
 * dashboard — which is what Zustand is listed for in the stack.
 *
 * Persistence is local; for a signed-in account the synced fields are mirrored
 * to Supabase by useProgressionSync, so progression follows the player across
 * devices.
 */
export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set) => {
      const award = (
        xp: number,
        activity: Omit<Activity, 'id' | 'xp' | 'at'>,
        updateStats: (stats: ProgressionStats) => ProgressionStats,
        updateDaily: (counters: DailyCounters) => DailyCounters = (counters) => counters,
      ) =>
        set((state) => {
          const stats = updateStats(state.stats)
          const today = dayKey()
          // A new calendar day wipes the counters the challenges read.
          const base = state.daily.day === today ? state.daily : emptyCounters(today)

          // Badges are granted here rather than by each mode, so a stat can
          // never move without its badges being reconsidered.
          const earned = earnedBadgeIds(stats)
          const fresh = earned.filter((id) => !state.unlockedBadges.includes(id))

          return {
            xp: state.xp + xp,
            stats,
            daily: updateDaily(base),
            activities: [
              { ...activity, id: activityId(), xp, at: new Date().toISOString() },
              ...state.activities,
            ].slice(0, ACTIVITY_LIMIT),
            unlockedBadges: fresh.length
              ? [...state.unlockedBadges, ...fresh]
              : state.unlockedBadges,
            pendingBadges: fresh.length ? [...state.pendingBadges, ...fresh] : state.pendingBadges,
          }
        })

      return {
        ...blankProgress(),
        ownerId: null,

        recordBattle: ({ outcome, byCheckmate, levelLabel }) => {
          const xp =
            outcome === 'win'
              ? XP_REWARDS.battleWin
              : outcome === 'draw'
                ? XP_REWARDS.battleDraw
                : XP_REWARDS.battleLoss
          const label =
            outcome === 'win'
              ? `Victoire contre l'IA (${levelLabel})`
              : outcome === 'draw'
                ? `Nulle contre l'IA (${levelLabel})`
                : `Défaite contre l'IA (${levelLabel})`

          award(
            xp,
            { kind: 'battle', label },
            (stats) => ({
              ...stats,
              gamesPlayed: stats.gamesPlayed + 1,
              gamesWon: stats.gamesWon + (outcome === 'win' ? 1 : 0),
              checkmatesDelivered:
                stats.checkmatesDelivered + (outcome === 'win' && byCheckmate ? 1 : 0),
            }),
            (counters) => ({
              ...counters,
              battleWins: counters.battleWins + (outcome === 'win' ? 1 : 0),
            }),
          )
        },

        recordPuzzle: ({ flawless, streak }) => {
          const xp = XP_REWARDS.puzzleSolved + (flawless ? XP_REWARDS.puzzleFlawless : 0)
          award(
            xp,
            { kind: 'puzzle', label: flawless ? `Puzzle résolu sans faute` : `Puzzle résolu` },
            (stats) => ({
              ...stats,
              puzzlesSolved: stats.puzzlesSolved + 1,
              flawlessPuzzles: stats.flawlessPuzzles + (flawless ? 1 : 0),
              bestPuzzleStreak: Math.max(stats.bestPuzzleStreak, streak),
            }),
            (counters) => ({ ...counters, puzzlesSolved: counters.puzzlesSolved + 1 }),
          )
        },

        recordHunt: ({ score, captures, championLabel }) => {
          award(
            huntXp(score),
            { kind: 'hunt', label: `Chasse terminée : ${score} pts (${championLabel})` },
            (stats) => ({
              ...stats,
              bestHuntScore: Math.max(stats.bestHuntScore, score),
              huntCaptures: stats.huntCaptures + captures,
            }),
            (counters) => ({
              ...counters,
              huntScore: Math.max(counters.huntScore, score),
              huntCaptures: counters.huntCaptures + captures,
            }),
          )
        },

        recordCoachAnalysis: ({ accuracy }) => {
          award(
            XP_REWARDS.coachGameAnalysed,
            { kind: 'coach', label: 'Partie analysée dans le Coach' },
            (stats) => {
              if (accuracy === null) return stats
              // Running mean, so one weak game does not erase the history.
              const samples = stats.accuracySamples + 1
              const previous = stats.averageAccuracy ?? accuracy
              return {
                ...stats,
                accuracySamples: samples,
                averageAccuracy: Math.round(previous + (accuracy - previous) / samples),
              }
            },
            (counters) => ({ ...counters, coachAnalyses: counters.coachAnalyses + 1 }),
          )
        },

        unlockBadges: (ids) =>
          set((state) => {
            const fresh = ids.filter((id) => !state.unlockedBadges.includes(id))
            if (fresh.length === 0) return state
            return {
              unlockedBadges: [...state.unlockedBadges, ...fresh],
              pendingBadges: [...state.pendingBadges, ...fresh],
            }
          }),

        acknowledgeBadges: () => set({ pendingBadges: [] }),

        setHuntScores: (update) => set((state) => ({ huntScores: update(state.huntScores) })),

        setPuzzleProgress: (update) =>
          set((state) => ({ puzzleProgress: update(state.puzzleProgress) })),

        hydrate: ({ xp, stats, unlockedBadges, huntScores, puzzleProgress }) =>
          // The server copy replaces the synced fields outright, rather than
          // being summed in, so signing in on a second device shows the account
          // as it is and never double counts. Badges arriving this way are
          // already known to the player, so they skip the pending queue that
          // drives the unlock animation.
          set({
            xp,
            stats: { ...EMPTY_STATS, ...stats },
            unlockedBadges,
            huntScores,
            puzzleProgress: { ...EMPTY_PROGRESS, ...puzzleProgress },
          }),

        adoptOwner: (ownerId) =>
          set((state) => {
            // Same identity as before: keep everything, this is a reload or a
            // second visit by the same player.
            if (state.ownerId === ownerId) return state

            // Guest progress being taken over by the account signing in. It is
            // this player's own work, so it is kept and seeded to the account.
            if (state.ownerId === null && ownerId !== null) return { ownerId }

            // Anything else — another account signing in, or signing out — is a
            // change of person. Their XP, badges and feed are not the newcomer's
            // to see, still less to write into their row, so start from nothing.
            return { ...blankProgress(), ownerId }
          }),

        reset: () => set({ ...blankProgress(), ownerId: null }),
      }
    },
    {
      name: 'chesstrainer.progression',
      version: 2,
      migrate: (persisted, version) => {
        // Records written before progression had an owner carry no way of
        // telling one player's work from another's. Zustand merges them over
        // the initial state, which would leave the previous account's XP and
        // badges sitting there as if they were a guest's — visible to the next
        // person, and seeded into the next account that has no row yet. There
        // is nothing to disambiguate them with, so the safe reading is to drop
        // them: a signed-in player gets theirs back from the server on the next
        // pull, and only an unclaimed guest total is lost, once.
        // Before the branches: a version-0 record can sit alongside the old
        // keys too, and returning early would have left them behind for good.
        if (version < 2) dropLegacyKeys()

        if (version < 1) return { ...blankProgress(), ownerId: null }
        // Version 1 kept the hunt board and the puzzle streak in localStorage
        // keys of their own, which were never tied to an account: whatever sits
        // there could belong to anyone who used this browser. Adopting it would
        // reintroduce the very leak this ownership work removes, so those keys
        // are discarded and the records start from nothing.
        if (version < 2) {
          const record = persisted as Record<string, unknown>
          return { ...record, huntScores: {}, puzzleProgress: EMPTY_PROGRESS }
        }
        return persisted
      },
    },
  ),
)

/** Level and progress derived from the stored XP. */
export function useLevelProgress(): LevelProgress {
  return levelFromXp(useProgressionStore((state) => state.xp))
}
