/**
 * Experience and levels (spec section 2.5): XP is earned in every mode and
 * feeds a 1–30 ladder.
 */

export const MAX_LEVEL = 30
/** XP needed to leave level 1. Each level then costs a little more. */
const BASE_STEP = 100
const STEP_GROWTH = 40

/** XP required to go from `level` to the next one. */
export function xpForNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0
  return BASE_STEP + (level - 1) * STEP_GROWTH
}

/** Total XP required to have reached `level`. */
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let step = 1; step < Math.min(level, MAX_LEVEL); step += 1) {
    total += xpForNextLevel(step)
  }
  return total
}

export interface LevelProgress {
  level: number
  /** XP earned inside the current level. */
  xpIntoLevel: number
  /** XP the current level costs in total, or 0 at the cap. */
  xpForLevel: number
  /** Share of the current level completed, 0–1. */
  ratio: number
  isMaxLevel: boolean
}

/** Turns a total XP amount into a level and the progress inside it. */
export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp))
  let level = 1
  let consumed = 0

  while (level < MAX_LEVEL && xp - consumed >= xpForNextLevel(level)) {
    consumed += xpForNextLevel(level)
    level += 1
  }

  const isMaxLevel = level >= MAX_LEVEL
  const xpForLevel = isMaxLevel ? 0 : xpForNextLevel(level)
  const xpIntoLevel = xp - consumed

  return {
    level,
    xpIntoLevel,
    xpForLevel,
    ratio: isMaxLevel ? 1 : Math.min(1, xpIntoLevel / xpForLevel),
    isMaxLevel,
  }
}

/** XP awarded by each mode, so the rewards stay comparable across the app. */
export const XP_REWARDS = {
  /** Finishing a game against the engine. */
  battleWin: 60,
  battleDraw: 30,
  battleLoss: 15,
  /** Solving a puzzle, before the flawless bonus. */
  puzzleSolved: 20,
  /** Solving one without a hint or a wrong move. */
  puzzleFlawless: 10,
  /** Every ten points scored in the hunt. */
  huntPerTenPoints: 1,
  /** Reviewing a finished game in the coach. */
  coachGameAnalysed: 25,
} as const

/** XP for a hunt round, from its score. */
export function huntXp(score: number): number {
  return Math.floor(Math.max(0, score) / 10) * XP_REWARDS.huntPerTenPoints
}
