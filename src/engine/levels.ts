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
 * Stockfish 18 has no strength below `UCI_Elo` 1320, and nothing in it goes
 * lower: an earlier play-test pinned levels 1 and 2 there with depth caps 4 and
 * 6 and found them dead even, the depth cap inert, and `UCI_Elo` barely moving
 * near the floor (.claude/rules/engine.md has the figures). One opponent under
 * two names, and too strong for a beginner.
 *
 * So levels 1 and 2 are weakened by the app instead (`weakening`, see
 * engine/weakening.ts): the engine runs unlimited at depth 6 and reports six
 * lines, and the battle draws one with odds `exp(-loss / T)`. Their `elo` is
 * measured, not handed to anything — `scripts/calibrate-levels.mjs`, 52 games
 * per matchup, two runs averaged (9 November 2026):
 *
 *   Débutant vs `UCI_Elo 1320`   23.1% / 30.8%  → Δ −175  → ~1150
 *   Novice vs Débutant           31.7% / 39.4%  → Δ −104  → ~1050
 *   Novice vs `UCI_Elo 1320`     16.3% / 22.1%  → Δ −252  (a bound, agrees)
 *   Débutant vs Intermédiaire    13.5% /  4.8%  (a bound: clearly weaker)
 *
 * These are figures on the engine's own scale, which its authors anchored to
 * the CCRL 40/4 engine rating list — not to Lichess, Chess.com or FIDE.
 * With 6 lines, raising `T` past ~650 changes little: the draw is close to
 * uniform by then. A weaker Novice needs more lines, and a re-measure.
 *
 * Treat every number as ±150 and as a way for a player to place themselves,
 * not as a rating earned against humans. Never restate these figures in copy —
 * import `ENGINE_LEVELS` and read `[0].elo` / `.at(-1).elo` (see
 * `src/features/home/modes.ts`).
 *
 * Depths are capped low on purpose (6–12). `UCI_Elo` does the weakening; extra
 * depth makes a rated bot no stronger, only slower — and a search that runs
 * past the battle's 10s `SEARCH_TIMEOUT_MS`, three times over, gives up on the
 * engine and freezes the board. Depth 12 measured a few hundred ms per move on
 * a desktop; a slow phone has ample room under the deadline.
 */

import type { Weakening } from '@/engine/weakening'

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6

export interface EngineLevel {
  id: LevelId
  label: string
  /** Player-facing strength, ±150 — a way to place yourself, not a rating. */
  elo: number
  /** What this opponent actually does, for the player choosing a level. */
  description: string
  /**
   * Fed to `UCI_Elo` under `UCI_LimitStrength`. Never below `UCI_ELO_FLOOR`;
   * null for a level below it, which `weakening` plays instead.
   */
  uciElo: number | null
  /** How a level below the floor draws its move (engine/weakening.ts); else null. */
  weakening: Weakening | null
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
    elo: 1050,
    description: 'Joue des coups sensés mais voit rarement au-delà du coup suivant.',
    uciElo: null,
    weakening: { candidates: 6, temperatureCp: 650 },
    depth: 6,
    minDelayMs: 300,
    maxDelayMs: 900,
  },
  {
    id: 2,
    label: 'Débutant',
    elo: 1150,
    description: 'Repère les prises et les échecs, mais n’a pas encore de plan.',
    uciElo: null,
    weakening: { candidates: 6, temperatureCp: 350 },
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
    weakening: null,
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
    weakening: null,
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
    weakening: null,
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
    weakening: null,
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
