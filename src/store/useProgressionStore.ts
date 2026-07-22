import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { earnedBadgeIds } from '@/features/progression/badges'
import { emptyCounters, type DailyCounters } from '@/features/progression/challenges'
import { XP_REWARDS, huntXp, levelFromXp, type LevelProgress } from '@/features/progression/levels'
import { dayKey } from '@/features/puzzle/dailySet'

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
 * The part of the progression that follows a signed-in account across devices
 * (specification deliverable 5). The daily counters reset each day and the
 * activity feed and pending-badge animations are local, so none of them belong
 * to the synced snapshot.
 */
export interface ProgressionSnapshot {
  xp: number
  stats: ProgressionStats
  unlockedBadges: string[]
}

interface ProgressionState {
  xp: number
  stats: ProgressionStats
  daily: DailyCounters
  activities: Activity[]
  unlockedBadges: string[]
  /** Badges unlocked but not yet shown to the player. */
  pendingBadges: string[]

  recordBattle: (input: BattleOutcomeInput) => void
  recordPuzzle: (input: { flawless: boolean; streak: number }) => void
  recordHunt: (input: { score: number; captures: number; championLabel: string }) => void
  recordCoachAnalysis: (input: { accuracy: number | null }) => void
  unlockBadges: (ids: string[]) => void
  acknowledgeBadges: () => void
  /** Replaces the synced fields with an account's server copy on sign-in. */
  hydrate: (snapshot: ProgressionSnapshot) => void
  reset: () => void
}

let activitySeq = 0
function activityId(): string {
  activitySeq += 1
  return `${Date.now().toString(36)}-${activitySeq}`
}

/**
 * Global progression (spec section 2.5). This is the first genuinely global,
 * persistent state in the app — XP is fed by all four modes and read by the
 * dashboard — which is what Zustand is listed for in the stack.
 *
 * Persistence is local; for a signed-in account the synced fields are mirrored
 * to Supabase by useProgressionSync, so progression follows the player across
 * devices (specification deliverable 5).
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
        xp: 0,
        stats: EMPTY_STATS,
        daily: emptyCounters(),
        activities: [],
        unlockedBadges: [],
        pendingBadges: [],

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

        hydrate: ({ xp, stats, unlockedBadges }) =>
          // The server copy replaces the synced fields outright, rather than
          // being summed in, so signing in on a second device shows the account
          // as it is and never double counts. Badges arriving this way are
          // already known to the player, so they skip the pending queue that
          // drives the unlock animation.
          set({
            xp,
            stats: { ...EMPTY_STATS, ...stats },
            unlockedBadges,
          }),

        reset: () =>
          set({
            xp: 0,
            stats: EMPTY_STATS,
            daily: emptyCounters(),
            activities: [],
            unlockedBadges: [],
            pendingBadges: [],
          }),
      }
    },
    { name: 'chesstrainer.progression' },
  ),
)

/** Level and progress derived from the stored XP. */
export function useLevelProgress(): LevelProgress {
  return levelFromXp(useProgressionStore((state) => state.xp))
}
