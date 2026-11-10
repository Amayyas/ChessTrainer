---
paths:
  - 'src/engine/**'
---

# The engine

Stockfish 18, the `lite-single` build: NNUE eval with the small net embedded in
the wasm, single-threaded. It is not an npm dependency — `stockfish@18` ships
every build flavor, ~240 MB installed — so the two files the app serves are
downloaded from a pinned GitHub release by `scripts/vendor-stockfish.mjs`,
hash-checked, and committed under `public/stockfish/`. Bump `RELEASE` there and
re-run `npm run vendor:stockfish` to update it.

No threaded build is shipped. The threaded flavors want `SharedArrayBuffer`,
which needs COOP/COEP on every response; `lite-single` avoids that entirely.
Multithreading is therefore not a flag — it means changing the build and the
headers both.

Strength is set two ways, and a level uses exactly one. A rated level goes
through Stockfish's own model: `configureLevel` sends `UCI_LimitStrength true`
then `UCI_Elo`, which the engine authors calibrated over 1320–3190, so its
`elo` is the number handed to the engine. A level below that floor — nothing in
the engine reaches it, see below — has `uciElo: null` and a `weakening`
instead: `configureLevel` sends `UCI_LimitStrength false` and `MultiPV N`, and
the battle draws its move from the N lines with odds `exp(-loss / T)`
(`src/engine/weakening.ts`). `MultiPV` is sent for every level, so a rated level
on a reused worker never inherits a weakened one's lines. `configureLevel` is
idempotent.

The draw is the app's own model, so its `elo` is only what the play-test says:
`scripts/calibrate-levels.mjs` imports the levels and the draw from `src/` and
anchors the strongest weakened level on a `UCI_Elo 1320` reference, then chains
each weaker one to its neighbour, keeping every step inside the band where a
score discriminates. Change a `weakening` and the figure is stale until the
script is run again (twice, averaged). A level too far below its neighbour for
one matchup to measure is chained through a bridge — a weakened configuration
that ships nowhere, declared in the script's `BRIDGES`. Each extra link adds its
error to every figure below it. The sweep's surprises are in the header of
`levels.ts`.

Two things that were measured rather than assumed, both counter-intuitive:

- **`Skill Level` is inert under `UCI_LimitStrength`.** Stockfish derives its
  internal skill from `UCI_Elo` alone and ignores the option — so it is not
  sent. At the 1320 floor the `go depth` cap is the only knob left — and the
  play-test found it does nothing (see below).
- **Stockfish 18 has no floor below ~1320, and nothing in it goes lower.** An
  earlier play-test (`scripts/calibrate-levels.mjs`, ~50 games/matchup) put
  levels 1–2 at that floor with depth caps 4 and 6: they played each other dead
  even across three runs, a level played the same at depth 2, 4, 6 and 10, and
  a depth-2 engine still scored 51% against a 1320 reference. `UCI_Elo` barely
  moved down there either (a 1400 setting bought ~40 Elo). A quick probe at
  `UCI_Elo 1320`, depth 4 saw the engine grab a hanging queen 8 times in 10 —
  it takes free material rather than hanging its own. That is why the levels
  below the floor are weakened by the app's draw rather than by any engine
  option. Run the script twice and average: the draw and `UCI_LimitStrength`
  are both random, so a matchup carries ~±90 Elo.

Before changing a level, read the header of `src/engine/levels.ts`. Every Elo
figure is worth ±150 — a way for a player to place themselves, not a rating.
Never restate those figures elsewhere; import them.

- **A score outside roughly 25–75% stops discriminating.** 96% is produced by a
  500-point gap and by a 1500-point one alike. Reading one as precise hid a
  chasm between the top two levels for two releases. When you recalibrate, check
  the gap between adjacent levels directly, not a self-play score.
- **Measure rather than recall.** Several confident claims about this engine
  turned out to be backwards — the Skill-Level point above was very nearly
  shipped the other way round, and before Stockfish 18 the belief was that the
  shipped build had no `UCI_Elo` at all. A claim about the engine is worth what
  the measurement behind it is worth.

Depth caps stay low (≤12). `UCI_Elo` does the weakening; extra depth makes a
rated bot no stronger, only slower, and the battle abandons a search that runs
past `SEARCH_TIMEOUT_MS` (10s) — which, three times over, gives up on the
engine and freezes the board.

`StockfishEngine` remembers the level from `configureLevel` and re-sends it to
any worker it boots to replace a wedged one. Nothing upstream re-runs
`configureLevel` after a recycle, so without that the battle would quietly play
on against a full-strength engine.
