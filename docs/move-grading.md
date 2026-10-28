# How the coach grades a move

The AI Coach gives every move a grade and each side an accuracy. This page
explains the model: what is compared with what, where the thresholds sit, and
the choices that look like bugs and are not. The code is
[`src/utils/evaluation.ts`](../src/utils/evaluation.ts), driven by
[`useCoachAnalysis`](../src/features/coach/useCoachAnalysis.ts).

## What is compared

Every position is analysed once by Stockfish at the coach's fixed depth (the
default in `useCoachAnalysis`) and cached by FEN: a position's evaluation does
not depend on the game that reached it.

To grade a move, the coach needs three positions:

1. the position **before** the move, whose analysis names the engine's best move;
2. the position reached by **that best move** — the baseline;
3. the position reached by **the move played**.

The move is measured by comparing 3 with 2: two positions at the same point in
the game, the same side to move. Comparing the played move against the
evaluation _before_ it would mix in the swing of the move itself.

Scores come out of the engine relative to the side to move and are turned into
White's point of view by `toWhiteEval`. A forced mate becomes a large stand-in
score (`MATE_CP`), so the evaluation bar can draw it, and keeps its distance
alongside.

## The grades

The loss is the centipawns the mover gave up against the baseline
(`centipawnLoss`), never negative. `classifyMove` turns it into a grade:

| Sign | Grade         | Centipawns lost       |
| ---- | ------------- | --------------------- |
| ★    | Meilleur coup | the engine's own move |
| !    | Excellent     | up to 10              |
| ✓✓   | Très bon      | up to 20              |
| ✓    | Bon coup      | up to 30              |
| ?!   | Imprécision   | up to 80              |
| ?    | Erreur        | up to 200             |
| ??   | Gaffe         | more than 200         |

A test, [`moveGradingDoc.test.ts`](../src/test/moveGradingDoc.test.ts), reads
this table and fails when it no longer matches `classifyMove`: a figure changed
in the code has to be changed here too.

The signs are the chess annotation marks, with two choices of our own: ★ rather
than `!!` for the best move, because annotators keep `!!` for a brilliant move
and the engine's first choice is often a quiet one; and a doubled tick for
"très bon" beside the single one for "bon coup", as `??` doubles `?`. The signs that find fault are set in
the rubric red, the rest in ink — see the [design system](design-system.md).
`MOVE_QUALITY` holds the labels, their plurals and their tone; the plurals are
written out rather than derived, because adding an "s" yields "Meilleur coups".

**★ is identified, never inferred.** A loss of zero does not mean the engine's
move was played: losses are clamped at zero, so a different move whose position
happens to evaluate a little higher reads as zero too. Only the move the engine
actually chose, compared in UCI form, earns ★. A move that delivers mate is
always ★: nothing outranks it, and the position it leaves has no continuation to
measure against.

## Mates

Two mates in the same direction both read as `MATE_CP`, so their centipawn
difference is zero however far apart they are — which once scored mate in ten
exactly like mate in one. When both the baseline and the played move lead to a
mate for the same side, the distance is compared instead: each move of delay
costs `SLOWER_MATE_CP`, up to `SLOWER_MATE_MAX_CP`.

That cap sits inside the inaccuracy band on purpose. A slower mate is still a
won game, and telling a player they blundered a move that still mates by force
would be false. Losing the mate altogether is a different event and is already
priced as one: a mate traded for a winning position is a loss of thousands of
centipawns down the ordinary path, which is a blunder.

Delay costs the same in defeat: hurrying one's own mate is priced like dawdling
over a win.

## Accuracy

Accuracy is measured on a different scale from the grade. Each evaluation is
turned into the mover's **winning chances** by a logistic curve
(`winningChances`), and a move's accuracy (`moveAccuracy`) falls with the drop
in winning chances between the baseline and the move played. Both curves are
Lichess's published model. A side's accuracy for the game is the mean over its
moves, rounded.

The two scales answer different questions. The grade says how much the move
gave away in centipawns; accuracy says how close to winning the player stayed.
A 300-centipawn slip is a blunder in a level position and costs a great deal of
accuracy; the same slip from +15 to +12 is still a blunder, but barely moves the
winning chances, so it costs almost no accuracy.

### Accuracy saturates on forced mates — deliberately

The winning-chances curve reads any mate, fast or slow, as a certainty. So a
move that turns mate in two into mate in six is graded below ★ but still
measures 100% accurate.

Pinning mates lower on the curve was measured before it was rejected: at 1250
centipawns a slow mate reads 98.5% accurate, at 600 it reads 87.6%. The number
that comes out depends on the stand-in chosen, not on anything the player did —
the scale decides the answer, not the evidence. Telling those mates apart in
accuracy would need a different model, not a different constant. It stays at
100%, because the grade already judges the move. A forced mate is a forced
mate.

## What happens to the figures

The game summary counts inaccuracies, mistakes and blunders and names the move
that gained the mover the most winning chances.

A summary is **complete** only when every move has been scored. A position the
engine declines to analyse three times (`MAX_REFUSALS`) is skipped so the
positions behind it are not starved; its move stays ungraded, the summary stays
incomplete, and the game is not recorded. That is the honest outcome — a
half-analysed game must not feed the player's statistics.

When a complete review is of a battle game, the player's accuracy feeds
`battleAccuracy` and the accuracy history in the progression store.

## Changing the model

- Change a threshold in `classifyMove` and this page in the same commit; the
  doc test holds them together.
- `MOVE_QUALITY_ORDER` is the legend's order. A tier added to `MOVE_QUALITY`
  but not there would go unexplained; a test holds the two together.
- Prove a new test can fail before trusting it — see [testing](testing.md).
