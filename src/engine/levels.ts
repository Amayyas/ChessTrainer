/**
 * Difficulty calibration for the battle mode.
 *
 * Stockfish 18 exposes `UCI_LimitStrength` + `UCI_Elo` (1320–3190) — a strength
 * model the engine's own authors calibrated. Levels 3–6 set it directly, so
 * their `elo` is the number fed to the engine, not a measurement against a
 * yardstick.
 *
 * `Skill Level` is *not* used. Measured, not assumed: under `UCI_LimitStrength`
 * Stockfish derives its internal skill from `UCI_Elo` alone and ignores the
 * `Skill Level` option — 12 searches at `UCI_Elo 1320` with `Skill Level 0`
 * and 12 with `Skill Level 20` returned the same spread of moves.
 *
 * Levels 1 and 2 both pin `UCI_Elo` at 1320: Stockfish 18 has no strength below
 * it. A play-test settled what that means — `scripts/calibrate-levels.mjs`, ~50
 * games per matchup. Near the floor nothing separates the two. The depth cap is
 * inert: level 1 played level 2 (depth 4 vs 6) dead even across three runs, and
 * played the same at depth 2 and depth 10; a depth-2 engine still scored 51%
 * against a `UCI_Elo 1320` reference. `UCI_Elo` barely moves down here too — a
 * 1400 setting gained about 40 Elo. So levels 1–2 are close by nature, both
 * about 1320; level 2's deeper cap costs nothing and stays for the rare sharp
 * position, and the `elo` gap below is a placement, not a measured difference.
 * Not from the calibration but consistent with it: a quick probe at `UCI_Elo
 * 1320`, depth 4 saw the engine grab a hanging queen 8 times in 10 — it takes
 * free material rather than hanging its own. "Novice" is a real beginner who
 * plays sound moves and calculates little, not one who blunders pieces.
 *
 * Treat every number as ±150 and as a way for a player to place themselves,
 * not as a rating earned against humans. Never restate these figures in copy —
 * import `ENGINE_LEVELS` and read `[0].elo` / `.at(-1).elo` (see
 * `src/features/home/modes.ts`).
 *
 * Depths are capped low on purpose (4–12). `UCI_Elo` does the weakening; extra
 * depth makes a rated bot no stronger, only slower — and a search that runs
 * past the battle's 10s `SEARCH_TIMEOUT_MS`, three times over, gives up on the
 * engine and freezes the board. Depth 12 measured a few hundred ms per move on
 * a desktop; a slow phone has ample room under the deadline.
 */

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6

export interface EngineLevel {
  id: LevelId
  label: string
  /** Player-facing strength, ±150 — a way to place yourself, not a rating. */
  elo: number
  /** What this opponent actually does, for the player choosing a level. */
  description: string
  /** Fed to `UCI_Elo` under `UCI_LimitStrength`. Never below `UCI_ELO_FLOOR`. */
  uciElo: number
  /** Search-depth cap handed to `go depth`. Keeps a move fast; `UCI_Elo` does the weakening (see the header). */
  depth: number
  /** Simulated thinking time, so moves do not appear instantly. */
  minDelayMs: number
  maxDelayMs: number
}

/** The bottom of Stockfish 18's `UCI_Elo` range — it plays no weaker than this. */
export const UCI_ELO_FLOOR = 1320

export const ENGINE_LEVELS: readonly EngineLevel[] = [
  {
    id: 1,
    label: 'Novice',
    elo: 1300,
    description: 'Joue des coups sensés mais voit rarement au-delà du coup suivant.',
    uciElo: UCI_ELO_FLOOR,
    depth: 4,
    minDelayMs: 300,
    maxDelayMs: 900,
  },
  {
    id: 2,
    label: 'Débutant',
    elo: 1350,
    description: 'Repère les prises et les échecs, mais n’a pas encore de plan.',
    uciElo: UCI_ELO_FLOOR,
    depth: 6,
    minDelayMs: 400,
    maxDelayMs: 1100,
  },
  {
    id: 3,
    label: 'Intermédiaire',
    elo: 1500,
    description: 'Calcule quelques coups d’avance et punit les erreurs simples.',
    uciElo: 1500,
    depth: 8,
    minDelayMs: 500,
    maxDelayMs: 1300,
  },
  {
    id: 4,
    label: 'Avancé',
    elo: 1800,
    description: 'Joue proprement et sanctionne les combinaisons courtes.',
    uciElo: 1800,
    depth: 10,
    minDelayMs: 600,
    maxDelayMs: 1500,
  },
  {
    id: 5,
    label: 'Maître',
    elo: 2100,
    description: 'Cherche loin et ne laisse presque rien passer.',
    uciElo: 2100,
    depth: 11,
    minDelayMs: 700,
    maxDelayMs: 1800,
  },
  {
    id: 6,
    label: 'Grand Maître',
    elo: 2500,
    description: 'Punit la moindre imprécision et ne pardonne aucun coup approximatif.',
    uciElo: 2500,
    depth: 12,
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
