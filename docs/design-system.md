# Design system: the chess column

The interface takes the chess column of a daily paper as its model: paper, ink,
one red, a news serif, rules instead of boxes, and the printed diagram. This
page states the rules. The values live in
[`src/lib/design-tokens.ts`](../src/lib/design-tokens.ts), which Tailwind reads;
nothing here restates a colour, a size or a duration, so it cannot drift from
them.

## Colour

- `paper`, `paper-bright`, `paper-deep` — the page; a sheet laid on it (light
  squares, fields, boxed asides); a flat tint for the rare place a rule alone
  does not separate.
- `ink`, `ink-soft`, `ink-faint` — text and rules; captions; metadata on the
  page only (it falls below AA on deep paper).
- `rubric` — the corrector's red. It marks what needs attention and nothing
  else: a wrong move, the coach's arrow, the current section, keyboard focus.
  It is never decoration and never a second accent.

Every text pair is held to WCAG AA by
[`design-tokens.test.ts`](../src/lib/design-tokens.test.ts). A new pair goes
into that test before it goes into a component.

## Type

- One family, Newsreader, self-hosted from
  [`src/lib/fonts.ts`](../src/lib/fonts.ts). The roman's optical-size axis
  follows the font size, so a headline gets the display cut without asking for
  it.
- Italic comes in the regular only, as the static regular declared in
  `src/index.css`: nothing is set in bold italic, which the browser would
  fake.
- The roman is preloaded, and the fallbacks are local serifs reshaped to its
  metrics (`fallbackFaces`), so the page does not move when it arrives. Their
  scales are measured at the sizes and weights the pages set: a new size can
  mean measuring them again, and a change of family always does.
- Medium is the headlines' weight and nothing else's: its fallback is scaled
  for their sizes, and would set text at body size too wide.
- The scale: `text-kicker`, `text-caption`, `text-body`, `text-lead`,
  `text-heading`, `text-title`, `text-headline`, `text-display`, and no other
  size: the theme offers none of Tailwind's own, and text that names no size is
  body text.
- Kickers are capitals with tracking: the served font has no true small caps.
- Figures that line up in a table use `tabular-nums lining-nums`.

## Surfaces

- No rounded corners, no shadows, no cards. Structure comes from rules: a
  section opens with a double rule, columns are separated by a hairline, an
  aside is a box with a one-pixel ink border on `paper-bright`.
- No gradients and no decorative backgrounds.

## Icons and notation

- No icon library. Chess figurines are the pictograms; actions are named in
  words.
- The mark is the figurine knight, ink on paper: the favicon draws it from the
  figurine face's own outline. The social image sets the masthead around the
  name; `scripts/render-social-image.mjs` renders it from the brand, the
  palette and the modes' titles, and a test fails when it no longer matches
  them.
- Moves are written in figurine notation. Grades use the chess annotation signs
  (`!`, `?!`, `?`, `??`), ★ for the best move, and ✓✓ and ✓ for very good and
  good moves.

## Motion

A piece glides to its square and the coach's arrow fades in, for the durations
in `durations`. Nothing else moves: nothing animates in on arrival and nothing
lifts under the pointer. Under `prefers-reduced-motion: reduce`, pieces jump
and nothing fades.

## Focus

Keyboard focus is a two-pixel `rubric` ring around a two-pixel `paper` band. On
the page the ring carries the contrast; on a dark surface, where the rubric
alone would not, the band does.

## The board

Every board is drawn by chessground and set as the column prints its diagram,
from the `board` tokens:

- The light squares are `paper-bright`; the dark ones are hatched in ink. A
  "Cases unies" toggle under each board the player plays on fills them with a
  plain grey instead, kept on the device. The landing's diagram is the page's
  figure and stays hatched.
- A double ink rule frames the squares; the coordinates stand outside it, in
  small italic.
- The pieces are the mpchess set, drawn in ink.
- What the board marks is in the rubric: the move just played, a king in check
  (with a rule), the coach's arrow, and in the Piece Hunt the enemies that can
  take the champion, and the champion while they can. The piece picked up is
  ringed in ink, and where it may go is an ink dot, or a ring round a piece it
  would take.
- Under each board the player plays on, a field takes a move from the keyboard:
  chessground answers the pointer alone.
- chessground draws one picture, so every board is also said in words: the
  position as its accessible description, and each move, or in the Piece Hunt
  the danger, in a live region as it happens.
