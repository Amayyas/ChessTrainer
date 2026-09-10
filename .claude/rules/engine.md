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

Strength is set through Stockfish's own model: `configureLevel` sends
`UCI_LimitStrength true` then `UCI_Elo`, which the engine authors calibrated
over 1320–3190, and nothing else. It is idempotent. Levels 3–6 set `UCI_Elo`
directly, so their `elo` is the number handed to the engine.

Two things that were measured rather than assumed, both counter-intuitive:

- **`Skill Level` is inert under `UCI_LimitStrength`.** Stockfish derives its
  internal skill from `UCI_Elo` alone and ignores the option — so it is not
  sent. At the 1320 floor the `go depth` cap is the only knob left — and the
  play-test found it does nothing (see below).
- **Stockfish 18 has no floor below ~1320, and nothing separates two levels
  sitting on it.** `scripts/calibrate-levels.mjs` (~50 games/matchup) settled
  levels 1–2: they play each other dead even across three runs, level 1 plays
  the same at depth 2, 4, 6 and 10, and a depth-2 engine still scores 51%
  against a 1320 reference. `UCI_Elo` barely moves down here too (a 1400 setting
  bought ~40 Elo). Both play about 1320; their `elo` gap is a placement, not a
  measured difference. Run the script twice and average — `UCI_LimitStrength`
  picks moves with time-seeded randomness, so a matchup carries ~±90 Elo. Not
  from the calibration but consistent with it: a quick probe at `UCI_Elo 1320`,
  depth 4 saw the engine grab a hanging queen 8 times in 10 — it takes free
  material rather than hanging its own, so "Novice" is a beginner who plays
  soundly, not one who blunders pieces.

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
