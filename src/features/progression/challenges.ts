import { dayKey } from '@/features/puzzle/dailySet'

/** Counters that reset every calendar day, feeding the daily challenges. */
export interface DailyCounters {
  day: string
  battleWins: number
  puzzlesSolved: number
  huntScore: number
  huntCaptures: number
  coachAnalyses: number
}

export function emptyCounters(day: string = dayKey()): DailyCounters {
  return { day, battleWins: 0, puzzlesSolved: 0, huntScore: 0, huntCaptures: 0, coachAnalyses: 0 }
}

export interface Challenge {
  id: string
  label: string
  target: number
  /** Reads how far the day has got. */
  progressOf: (counters: DailyCounters) => number
}

/** The pool the day's challenges are drawn from (spec section 2.5). */
export const CHALLENGE_POOL: readonly Challenge[] = [
  {
    id: 'puzzles-3',
    label: 'Résoudre 3 puzzles',
    target: 3,
    progressOf: (counters) => counters.puzzlesSolved,
  },
  {
    id: 'battle-win',
    label: "Gagner une partie contre l'IA",
    target: 1,
    progressOf: (counters) => counters.battleWins,
  },
  {
    id: 'hunt-150',
    label: 'Marquer 150 points à la Chasse',
    target: 150,
    progressOf: (counters) => counters.huntScore,
  },
  {
    id: 'hunt-captures-15',
    label: 'Capturer 15 pièces à la Chasse',
    target: 15,
    progressOf: (counters) => counters.huntCaptures,
  },
  {
    id: 'coach-analysis',
    label: 'Analyser une partie dans le Coach',
    target: 1,
    progressOf: (counters) => counters.coachAnalyses,
  },
  {
    id: 'puzzles-5',
    label: 'Terminer la série de 5 puzzles',
    target: 5,
    progressOf: (counters) => counters.puzzlesSolved,
  },
]

/** Challenges offered per day. */
export const DAILY_CHALLENGE_COUNT = 3

function seedFromDay(key: string): number {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) || 1
}

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The day's challenges: a stable draw for that date, spread across modes. */
export function dailyChallenges(
  day: string = dayKey(),
  pool: readonly Challenge[] = CHALLENGE_POOL,
  count: number = DAILY_CHALLENGE_COUNT,
): Challenge[] {
  const random = mulberry32(seedFromDay(day))
  const indices = pool.map((_, index) => index)

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }

  const picked: Challenge[] = []
  const seenMetrics = new Set<string>()
  for (const index of indices) {
    const challenge = pool[index]!
    // Two challenges reading the same counter would advance together, which
    // reads as a bug to the player.
    const metric = challenge.id.replace(/-\d+$/, '')
    if (seenMetrics.has(metric)) continue
    seenMetrics.add(metric)
    picked.push(challenge)
    if (picked.length >= count) break
  }

  return picked
}

export interface ChallengeProgress {
  challenge: Challenge
  progress: number
  isComplete: boolean
}

export function challengeProgress(
  counters: DailyCounters,
  day: string = dayKey(),
): ChallengeProgress[] {
  // Yesterday's counters must not count towards today's challenges.
  const fresh = counters.day === day ? counters : emptyCounters(day)
  return dailyChallenges(day).map((challenge) => {
    const progress = Math.min(challenge.target, challenge.progressOf(fresh))
    return { challenge, progress, isComplete: progress >= challenge.target }
  })
}
