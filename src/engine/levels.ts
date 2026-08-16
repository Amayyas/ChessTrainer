/**
 * Difficulty calibration for the battle mode.
 *
 * UCI_LimitStrength / UCI_Elo would be the natural choice, but the
 * Stockfish 11 build we ship does not expose either option — it only offers
 * `Skill Level`, `Skill Level Maximum Error` and `Skill Level Probability`.
 * (No Stockfish build reaches 800 Elo through UCI_Elo anyway: its floor is
 * ~1320.) Levels therefore combine those three parameters, plus a search-depth
 * cap on the weakest levels, which is the only way down to novice strength.
 *
 * The Elo figures are target strengths, not measured ratings.
 */

export type LevelId = 1 | 2 | 3 | 4 | 5

export interface EngineLevel {
  id: LevelId
  label: string
  /** Approximate target strength. */
  elo: number
  /** Stockfish `Skill Level`, 0–20. */
  skill: number
  /** Stockfish `Skill Level Maximum Error`, in centipawns. */
  maxError: number
  /** Stockfish `Skill Level Probability`, 1–1000. Lower = errs more often. */
  errorProbability: number
  /** Search depth cap. */
  depth: number
  /** Simulated thinking time, so moves do not appear instantly. */
  minDelayMs: number
  maxDelayMs: number
}

export const ENGINE_LEVELS: readonly EngineLevel[] = [
  {
    id: 1,
    label: 'Novice',
    elo: 800,
    skill: 0,
    maxError: 900,
    errorProbability: 10,
    depth: 2,
    minDelayMs: 300,
    maxDelayMs: 900,
  },
  {
    id: 2,
    label: 'Débutant',
    elo: 1000,
    skill: 2,
    maxError: 700,
    errorProbability: 30,
    depth: 3,
    minDelayMs: 400,
    maxDelayMs: 1100,
  },
  {
    id: 3,
    label: 'Intermédiaire',
    elo: 1300,
    skill: 5,
    maxError: 500,
    errorProbability: 60,
    depth: 5,
    minDelayMs: 500,
    maxDelayMs: 1300,
  },
  {
    id: 4,
    label: 'Avancé',
    elo: 1700,
    skill: 10,
    maxError: 300,
    errorProbability: 150,
    depth: 8,
    minDelayMs: 600,
    maxDelayMs: 1500,
  },
  {
    id: 5,
    label: 'Maître',
    elo: 2200,
    skill: 16,
    maxError: 150,
    errorProbability: 400,
    depth: 11,
    minDelayMs: 700,
    maxDelayMs: 1800,
  },
]

export function getLevel(id: LevelId): EngineLevel {
  return ENGINE_LEVELS.find((level) => level.id === id) ?? ENGINE_LEVELS[2]!
}

/** A random think time inside the level's range, for human-looking pacing. */
export function thinkingDelay(level: EngineLevel): number {
  return level.minDelayMs + Math.random() * (level.maxDelayMs - level.minDelayMs)
}
