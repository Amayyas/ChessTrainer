import { CAPTURE_VALUE, type ChampionType, type EnemyType } from '@/features/hunt/board'

/** Captures closer together than this keep the combo alive (spec section 2.4). */
export const COMBO_WINDOW_MS = 2_500
/** The specification caps the multiplier at x4. */
export const MAX_COMBO = 4

/** Round length and lives (spec section 2.4). */
export const ROUND_MS = 60_000
export const STARTING_LIVES = 3
/** A capture costs a life and five seconds. */
export const CAPTURE_PENALTY_MS = 5_000
/** How long the champion may stay in danger before being taken. */
export const DANGER_GRACE_MS = 1_000
/** Pause between being taken and reappearing, so the capture is readable. */
export const RESPAWN_DELAY_MS = 700

/**
 * The multiplier after a capture: consecutive quick captures build it up to the
 * cap, a slower one starts again at x1.
 */
export function nextCombo(previousCombo: number, msSinceLastCapture: number): number {
  if (msSinceLastCapture > COMBO_WINDOW_MS) return 1
  return Math.min(MAX_COMBO, previousCombo + 1)
}

/** Points for taking an enemy, combo included. */
export function capturePoints(enemy: EnemyType, combo: number): number {
  return CAPTURE_VALUE[enemy] * Math.max(1, combo)
}

export interface HuntScoreEntry {
  champion: ChampionType
  score: number
  captures: number
  /** ISO date the round was played. */
  playedAt: string
}

export type Scoreboard = Partial<Record<ChampionType, HuntScoreEntry[]>>

/** Entries kept per champion (spec section 2.4: top 5 per piece). */
export const SCOREBOARD_SIZE = 5

/** Inserts a round into the local table, keeping the best five for that piece. */
export function addScore(
  board: Scoreboard,
  entry: HuntScoreEntry,
  limit = SCOREBOARD_SIZE,
): Scoreboard {
  const previous = board[entry.champion] ?? []
  const next = [...previous, entry]
    .sort((a, b) => b.score - a.score || b.captures - a.captures)
    .slice(0, limit)
  return { ...board, [entry.champion]: next }
}

/** Best score recorded for a champion, or zero. */
export function personalBest(board: Scoreboard, champion: ChampionType): number {
  return board[champion]?.[0]?.score ?? 0
}

/** A closing line matched to how the round went (spec section 2.4). */
export function encouragement(score: number, best: number, captures: number): string {
  if (captures === 0) return 'Prenez le temps de repérer les cases atteignables, puis foncez !'
  if (score >= best && score > 0) return 'Nouveau record personnel — impressionnant !'
  if (score >= best * 0.7) return 'Tout près de votre record, la prochaine est la bonne.'
  return 'Belle chasse ! Enchaînez les captures rapides pour faire grimper le combo.'
}
