/**
 * Moves as the newsprint column prints them: in figurine notation, the piece
 * drawn rather than lettered — ♞f3 for Nf3 — so the English letters chess.js
 * writes never reach a French page.
 *
 * A figurine means nothing to a screen reader, which would spell out "black
 * chess knight" or nothing at all. So each one is paired with the French
 * letter for its piece, read instead: C for cavalier, F for fou, T for tour,
 * D for dame, R for roi — the notation a French scoresheet uses.
 */

/** A piece letter in English SAN, as chess.js writes moves. */
export type PieceLetter = 'K' | 'Q' | 'R' | 'B' | 'N'

/**
 * The figurine for each piece. One glyph for either side, as print sets them:
 * the move number and the column already say whose move it is.
 */
export const FIGURINES: Record<PieceLetter, string> = {
  K: '♚',
  Q: '♛',
  R: '♜',
  B: '♝',
  N: '♞',
}

/** The French letter for each piece: roi, dame, tour, fou, cavalier. */
export const FRENCH_LETTERS: Record<PieceLetter, string> = {
  K: 'R',
  Q: 'D',
  R: 'T',
  B: 'F',
  N: 'C',
}

/**
 * The code points the self-hosted figurine face covers: the twelve chess
 * pieces, ★ and ✓. The @font-face in src/index.css declares the same
 * unicode-range, and a test holds the two together.
 */
export const FIGURINE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x2605, 0x2605],
  [0x2654, 0x265f],
  [0x2713, 0x2713],
]

/** Whether every character of `text` is drawn by the figurine face. */
export function inFigurineFace(text: string): boolean {
  return [...text].every((char) => {
    const code = char.codePointAt(0)!
    return FIGURINE_RANGES.some(([from, to]) => code >= from && code <= to)
  })
}

export type NotationPart = { text: string } | { piece: PieceLetter }

function isPieceLetter(char: string): char is PieceLetter {
  return Object.prototype.hasOwnProperty.call(FIGURINES, char)
}

/**
 * Splits a move in English SAN into its text and its pieces: `Nxe5+` is the
 * knight, then `xe5+`; `e8=Q#` is `e8=`, the queen, then `#`. A pawn move and
 * castling carry no piece letter, so they come back as one run of text.
 */
export function notationParts(san: string): NotationPart[] {
  const parts: NotationPart[] = []
  let text = ''
  for (const char of san) {
    if (isPieceLetter(char)) {
      if (text) parts.push({ text })
      text = ''
      parts.push({ piece: char })
    } else {
      text += char
    }
  }
  if (text) parts.push({ text })
  return parts
}
