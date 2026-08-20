/**
 * Difficulty calibration for the battle mode.
 *
 * UCI_LimitStrength / UCI_Elo would be the natural choice, but the Stockfish 11
 * build we ship exposes neither — asking it for its options returns only
 * `Skill Level`, `Skill Level Maximum Error` and `Skill Level Probability`.
 * Levels therefore combine those three with a search-depth cap, which is the
 * only way down to genuine beginner strength.
 *
 * There is deliberately no Elo figure here. Without UCI_Elo there is no
 * calibrated opponent to anchor against, so any number would be invented — and
 * the ones this file used to carry were: measured by self-play, the ladder they
 * described (gaps of 200/300/400/500) had real gaps of roughly 470, 220, and
 * two so large that the stronger level won every single game. Levels are
 * described by what they do instead, which is both honest and more use to
 * someone choosing one.
 *
 * The ladder below was measured the same way, 14 games per pairing, alternating
 * colours: each level beats the one under it between 61% and 96% of the time,
 * and none of them wins everything. Those percentages carry hundreds of Elo of
 * uncertainty at that sample size — two runs of one pairing gave 76 and 338 —
 * so they establish the ordering and the absence of a wall, nothing finer.
 */

export type LevelId = 1 | 2 | 3 | 4 | 5

export interface EngineLevel {
  id: LevelId
  label: string
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
    description:
      'Ne regarde qu\u2019un seul coup : il laisse ses pièces en prise et rate les vôtres.',
    skill: 0,
    maxError: 5000,
    errorProbability: 1,
    depth: 1,
    minDelayMs: 300,
    maxDelayMs: 900,
  },
  {
    id: 2,
    label: 'Débutant',
    description: 'Voit la réponse immédiate : il reprend une pièce, mais ne prépare rien.',
    skill: 0,
    maxError: 900,
    errorProbability: 10,
    depth: 2,
    minDelayMs: 400,
    maxDelayMs: 1100,
  },
  {
    id: 3,
    label: 'Intermédiaire',
    description: 'Calcule quelques coups d\u2019avance et punit les erreurs simples.',
    skill: 2,
    maxError: 700,
    errorProbability: 25,
    depth: 3,
    minDelayMs: 500,
    maxDelayMs: 1300,
  },
  {
    id: 4,
    label: 'Avancé',
    description: 'Joue proprement et sanctionne les combinaisons courtes.',
    skill: 6,
    maxError: 400,
    errorProbability: 80,
    depth: 5,
    minDelayMs: 600,
    maxDelayMs: 1500,
  },
  {
    id: 5,
    label: 'Maître',
    description: 'Cherche loin et ne laisse presque rien passer.',
    skill: 12,
    maxError: 250,
    errorProbability: 200,
    depth: 8,
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
