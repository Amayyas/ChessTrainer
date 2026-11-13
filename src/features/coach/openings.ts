import { BOOK_HASHES, BOOK_LABELS, OPENING_LABELS } from '@/features/coach/openings.data'
import { positionHash } from '@/features/coach/positionHash'

export interface Opening {
  /** Encyclopaedia of Chess Openings code, e.g. 'B90'. */
  eco: string
  /** French name, e.g. 'Défense sicilienne, variante Najdorf'. */
  name: string
}

export interface OpeningReading {
  /** The opening of the deepest named book position the game reached. */
  opening: Opening
  /**
   * Index in the move list of the first move that left the book, or null while
   * every move so far is a book move.
   */
  exitPly: number | null
}

/** The positions a move goes between, as chess.js reports them. */
export interface PlayedMove {
  before: string
  after: string
}

/** The standard starting position, without its move counters. */
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'

/** Unsigned LEB128 varints out of base64, as scripts/build-openings.mjs wrote them. */
function decodeVarints(base64: string): number[] {
  const bytes = atob(base64)
  const values: number[] = []
  let value = 0
  let scale = 1
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes.charCodeAt(index)
    value += (byte & 0x7f) * scale
    if (byte & 0x80) {
      scale *= 128
    } else {
      values.push(value)
      value = 0
      scale = 1
    }
  }
  return values
}

let book: Map<number, number> | null = null

/** Position hash → label index, or -1 for a book position no line ends on. Built once. */
function bookIndex(): Map<number, number> {
  if (book) return book
  const deltas = decodeVarints(BOOK_HASHES)
  const labels = decodeVarints(BOOK_LABELS)
  book = new Map()
  let hash = 0
  deltas.forEach((delta, index) => {
    hash += delta
    book!.set(hash, labels[index]! - 1)
  })
  return book
}

/**
 * Which opening a game is in, and where it left theory.
 *
 * The moves are read in order until one reaches a position outside the book;
 * the opening is the last named position before that. Positions, not move
 * orders, are matched, so a transposition into a named line is recognised.
 * A game that came back into the book after leaving it is still out of it: the
 * moment theory was left is what the reading reports.
 *
 * Null with no moves, and for a game that did not start from the standard
 * position — a position set up in the coach's free analysis has no opening.
 */
export function readOpening(moves: readonly PlayedMove[]): OpeningReading | null {
  const first = moves[0]
  if (!first || first.before.split(' ').slice(0, 4).join(' ') !== START) return null

  const index = bookIndex()
  let opening: Opening | null = null
  for (let ply = 0; ply < moves.length; ply += 1) {
    const label = index.get(positionHash(moves[ply]!.after))
    if (label === undefined) return opening ? { opening, exitPly: ply } : null
    if (label >= 0) {
      const [eco, name] = OPENING_LABELS[label]!
      opening = { eco, name }
    }
  }
  return opening ? { opening, exitPly: null } : null
}
