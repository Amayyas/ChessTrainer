# Accessibility

How ChessTrainer is played without a mouse and without seeing the board, what
holds it to that, and what is still missing. The boards are the hard part:
chessground draws each one as a single picture with no element per square, so
everything a sighted player reads off it has to be said in words and done from
the keyboard by other means.

## The boards in words

[`src/utils/describeBoard.ts`](../src/utils/describeBoard.ts) turns a position,
a move or the Piece Hunt's danger into French sentences. Every board uses it in
two ways.

**The position is the board's description.** The board is exposed as an image
(`role="img"`) whose `aria-describedby` points at a hidden paragraph listing
each side's pieces and whose move it is: "Blancs : Roi g1 ; Dame d1 … Trait aux
blancs." It is `hidden` rather than visually hidden on purpose: a description is
read with the picture, and an exposed paragraph would read the whole position a
second time.

**Moves are announced as they happen**, in a polite live region under the board:
"Les noirs jouent Cavalier de g8 en f6", with captures, castling, en passant,
promotion, check and mate. The pages hand the board the list of moves played
(`moves` on `ChessBoard`), and `describeNewMoves` decides what is new:

- one or two moves added — a move, or a move and the engine's reply arriving
  together — are both said;
- more than two at once, as a replay jumping to its end, says only the last;
- moves taken back, by an undo or a step back through a replay, say nothing.

A diagram, such as the landing's, has a description and no live region.

**In the Piece Hunt, danger is urgent.** The hunt board has an assertive live
region instead: the enemies that can take the champion, said again on each
square the champion moves to, and the champion being taken. Its description
gives where the champion stands, the enemies by kind, and the threats.

### Saying the same sentence twice

A live region speaks only when its text changes. A position can produce the same
sentence twice in a row — the same move after a take-back, the same danger on a
new square — and a screen reader would stay silent the second time. The board
and the hunt therefore alternate a trailing no-break space on each new
announcement, which changes the text without changing what is heard. An emptied
announcement stays truly empty, so a reader is not handed a lone space.

## Playing from the keyboard

Under every board the player plays on is a field,
[`KeyboardField`](../src/components/Board/KeyboardField.tsx), played on Enter:

- **Chess boards** ([`MoveInput`](../src/components/Board/MoveInput.tsx)) take a
  move in French algebraic notation — R, D, T, F, C for roi, dame, tour, fou,
  cavalier, as a French scoresheet writes them — or from square to square.
  [`moveText.ts`](../src/utils/moveText.ts) reads it against the legal moves
  and answers in a sentence when it cannot: an illegal move, an ambiguous one, a
  promotion without its piece.
- **The Piece Hunt** ([`SquareInput`](../src/features/hunt/SquareInput.tsx))
  takes only the square to go to, since the champion is the only piece to move.

The field stays usable while the board takes no move — during the engine's
reply, say — and explains why the move was not played rather than going
disabled under the player's cursor. Its messages are a polite live region too.

On screen, moves are printed in figurine notation (♞f3). A figurine means
nothing to a screen reader, so each one is paired with its French letter, which
is what is read.

## The rest of the page

- **The language is French**, declared on `<html lang="fr">`, so a screen reader
  picks the right voice.
- **A skip link** is the first stop on every page and goes straight to the
  content.
- **Keyboard focus** is a two-pixel rubric ring around a two-pixel paper band,
  visible on the page and on dark surfaces alike — see the
  [design system](design-system.md#focus).
- **Status and errors** are announced: game state, puzzle results and the
  spinner as `role="status"`, errors as `role="alert"`.
- **Colour is never the only signal.** A grade's sign carries its meaning by
  shape first — `?`, `??`, `✓` — and its rubric red second.
- **Contrast** is held to WCAG AA for every text pair by
  [`design-tokens.test.ts`](../src/lib/design-tokens.test.ts). A new pair goes
  into that test before it goes into a component.
- **Motion** is limited to a piece gliding and the coach's arrow fading in.
  Under `prefers-reduced-motion: reduce`, pieces jump and nothing fades.
- **Text is on one type scale**, and a browser test fails on any word set off
  it.

## What holds it

- Unit tests on `describeBoard`, on the boards' live regions (a move and its
  reply, a take-back, the same move said again after one), on the hunt's
  alerts, and on the keyboard fields.
- A browser smoke test that plays a move on the coach and reads the board's
  description and the announcement from the page.
- Lighthouse's accessibility score, blocking in CI, against the threshold in
  [`lighthouserc.json`](../lighthouserc.json).

None of this replaces listening. A change to what the boards say is worth
hearing in a real screen reader — VoiceOver on macOS and iOS, NVDA on Windows —
before it ships.

## Known limits

- **No square can be visited one by one.** chessground renders no element per
  square, so there is nothing to tab through; the keyboard field is how a move
  is made, and the description is how the position is read.
- **On the Coach page a check is heard twice**: once in the move's announcement
  and once in the status line under the board.
- **Leaving the coach's replay before its end** announces the move or moves
  that come back into view, as stepping forward does.
- **The Piece Hunt's grace period** to step out of danger (`DANGER_GRACE_MS` in
  [`scoring.ts`](../src/features/hunt/scoring.ts)) is short for someone
  listening to the alert, and the round is timed. It is an arcade mode, and
  nothing yet offers a slower one.
