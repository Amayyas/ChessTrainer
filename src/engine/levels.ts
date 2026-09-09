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
 * and 12 with `Skill Level 20` returned the same spread of moves. So the only
 * lever left below the 1320 floor is the search-depth cap.
 *
 * Levels 1–2 both pin `UCI_Elo` at 1320 and differ only by that cap (depth 4
 * vs 6). They are close on purpose: Stockfish 18 has no floor below ~1320. The
 * old Skill-Level-0 engine hung pieces; this one does not — at `UCI_Elo 1320`,
 * depth 4, it still grabbed a hanging queen in 8 of 10 tries. "Novice" here is
 * a genuine beginner who plays sound moves and calculates little, not a player
 * who blunders material. Their `elo` is a rough placement and the header marks
 * it provisional: the recalibration pass (see below) still has to play levels
 * 1–2 against a reference and settle the two numbers and the descriptions.
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
  /** Player-facing strength, ±150. Provisional at the 1320 floor (see the header). */
  elo: number
  /** What this opponent actually does, for the player choosing a level. */
  description: string
  /** Fed to `UCI_Elo` under `UCI_LimitStrength`. Never below Stockfish's 1320 floor. */
  uciElo: number
  /** Search-depth cap handed to `go depth`; the only lever below the 1320 floor. */
  depth: number
  /** Simulated thinking time, so moves do not appear instantly. */
  minDelayMs: number
  maxDelayMs: number
}

export const ENGINE_LEVELS: readonly EngineLevel[] = [
  {
    id: 1,
    label: 'Novice',
    elo: 1100,
    description: 'Joue des coups sensés mais ne calcule qu’un coup à l’avance.',
    uciElo: 1320,
    depth: 4,
    minDelayMs: 300,
    maxDelayMs: 900,
  },
  {
    id: 2,
    label: 'Débutant',
    elo: 1300,
    description: 'Reprend le matériel et évite les gaffes, mais ne prépare rien.',
    uciElo: 1320,
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
