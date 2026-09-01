---
paths:
  - 'src/engine/**'
---

# The engine

The Stockfish 11 build shipped here is single-threaded and exposes `Skill Level`,
not `UCI_Elo`. The package contains no threaded build at all, so multithreading
is not a flag: it means replacing the engine.

Before changing a level, read the header of `src/engine/levels.ts`. It records
how each Elo figure was obtained, against which opponent, and what the number is
worth — ±150, a way for a player to place themselves rather than a rating. Never
restate those figures elsewhere; import them.

Three traps, each already sprung once in this project:

- **A score outside roughly 25–75% stops discriminating.** 96% is produced by a
  500-point gap and by a 1500-point one alike. Reading one as precise hid a
  chasm between the top two levels for two releases.
- **`maxError` and `errorProbability` are not inert**, including on levels whose
  depth cap sits below `1 + Skill Level`. Measured, not assumed: 30 searches at
  depth 5 with Skill Level 20 returned the same move 30 times, while the same
  depth with Avancé's settings returned five different moves.
- **Measure rather than recall.** Several confident claims about this engine
  turned out to be backwards. A claim about the engine is worth what the
  measurement behind it is worth.
