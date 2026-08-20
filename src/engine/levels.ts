/**
 * Difficulty calibration for the battle mode.
 *
 * UCI_LimitStrength / UCI_Elo would be the natural choice, but the Stockfish 11
 * build we ship exposes neither — asking it for its options returns only
 * `Skill Level`, `Skill Level Maximum Error` and `Skill Level Probability`.
 * Levels therefore combine those three with a search-depth cap, which is the
 * only way down to genuine beginner strength.
 *
 * The weakening applies at every depth here, including the levels whose cap
 * sits below `1 + Skill Level`. Stockfish 11 also picks a weakened move at the
 * end of the search, not only when the loop reaches that depth. Verified rather
 * than assumed: on one middlegame position, 30 searches at depth 5 with Skill
 * Level 20 returned the same move 30 times, while the same depth with Avancé's
 * settings returned five different moves and the engine's own choice only 3
 * times. Do not remove maxError or errorProbability on the theory that they are
 * inert.
 *
 * ## Where the Elo figures come from
 *
 * Each level was played against Stockfish 18 with UCI_LimitStrength on, which
 * is a calibrated opponent this build cannot provide for itself. That reference
 * runs at a fixed 100ms per move while ours keeps its depth cap, so these are
 * measurements against a yardstick rather than ratings earned against humans.
 *
 * Only scores between roughly 25% and 75% were used. Outside that band the Elo
 * formula stops discriminating: a 96% score is produced by a 500-point gap and
 * by a 1500-point gap alike, which is exactly how an earlier version of this
 * ladder hid a chasm between its top two levels behind a healthy-looking
 * number.
 *
 * UCI_Elo bottoms out at 1320, so Novice sits below any available anchor. Its
 * figure is chained from Débutant through 20 self-play games instead, and is
 * the least certain of the six.
 *
 * Treat every number as ±150 and as a way for a player to place themselves,
 * not as a rating.
 */

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6

export interface EngineLevel {
  id: LevelId
  label: string
  /** Measured against Stockfish 18 at a stated UCI_Elo. See the note above. */
  elo: number
  /** What this opponent actually does, for the player choosing a level. */
  description: string
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
    elo: 550,
    description: 'Laisse ses pièces en prise et ne voit pas les vôtres.',
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
    description: 'Reprend une pièce, mais ne prépare rien.',
    skill: 6,
    maxError: 500,
    errorProbability: 60,
    depth: 4,
    minDelayMs: 400,
    maxDelayMs: 1100,
  },
  {
    id: 3,
    label: 'Intermédiaire',
    elo: 1350,
    description: 'Calcule quelques coups d’avance et punit les erreurs simples.',
    skill: 10,
    maxError: 400,
    errorProbability: 100,
    depth: 5,
    minDelayMs: 500,
    maxDelayMs: 1300,
  },
  {
    id: 4,
    label: 'Avancé',
    elo: 2000,
    description: 'Joue proprement et sanctionne les combinaisons courtes.',
    skill: 12,
    maxError: 320,
    errorProbability: 140,
    depth: 6,
    minDelayMs: 600,
    maxDelayMs: 1500,
  },
  {
    id: 5,
    label: 'Maître',
    elo: 2250,
    description: 'Cherche loin et ne laisse presque rien passer.',
    skill: 16,
    maxError: 250,
    errorProbability: 200,
    depth: 6,
    minDelayMs: 700,
    maxDelayMs: 1800,
  },
  {
    id: 6,
    label: 'Grand Maître',
    elo: 2450,
    description: 'Punit la moindre imprécision et ne pardonne aucun coup approximatif.',
    skill: 16,
    maxError: 220,
    errorProbability: 250,
    depth: 7,
    minDelayMs: 800,
    maxDelayMs: 2000,
  },
]

export function getLevel(id: LevelId): EngineLevel {
  return ENGINE_LEVELS.find((level) => level.id === id) ?? ENGINE_LEVELS[2]!
}

/** A random think time inside the level's range, for human-looking pacing. */
export function thinkingDelay(level: EngineLevel): number {
  return level.minDelayMs + Math.random() * (level.maxDelayMs - level.minDelayMs)
}
