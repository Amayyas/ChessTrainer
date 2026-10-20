import type { Color, PieceSymbol, Square } from '@/utils/chess'
import { piecesOf } from '@/utils/fen'
import { FRENCH_LETTERS, type PieceLetter } from '@/utils/notation'

/** A move read from what was typed, ready for the board's onMove. */
export interface TypedMove {
  from: Square
  to: Square
  promotion?: PieceSymbol
}

/** What the reader needs from the position: no more than the board has. */
export interface MovePosition {
  fen: string
  turn: Color
  getLegalTargets: (square: Square) => Square[]
  isPromotion: (from: Square, to: Square) => boolean
}

/** The move, or a sentence for the player saying why there is none. */
export type ReadMove = TypedMove | { error: string }

/** The piece each French letter names: roi, dame, tour, fou, cavalier. */
const PIECE_OF: Record<string, PieceSymbol> = Object.fromEntries(
  (Object.entries(FRENCH_LETTERS) as Array<[PieceLetter, string]>).map(([english, french]) => [
    french,
    english.toLowerCase() as PieceSymbol,
  ]),
)

/** The letters a pawn may become, in the order a scoresheet lists them. */
const PROMOTION_LETTERS = Object.keys(PIECE_OF).filter((letter) => PIECE_OF[letter] !== 'k')

/** A pawn's new piece, in either case: nothing else can follow a square. */
const PROMOTED = `[${PROMOTION_LETTERS.join('')}${PROMOTION_LETTERS.join('').toLowerCase()}]`

/**
 * Algebraic notation with the French letters: an optional piece, an optional
 * file or rank to say which of two, an optional capture sign, the square, and
 * for a pawn reaching the last rank the piece it becomes.
 */
const ALGEBRAIC = new RegExp(
  `^([${Object.keys(PIECE_OF).join('')}])?([a-h])?([1-8])?([-x:])?([a-h][1-8])(?:=?(${PROMOTED}))?$`,
)

/** From square to square, as an engine writes it, with the piece a pawn becomes. */
const COORDINATES = new RegExp(`^([a-h][1-8])[-x:\\s]?([a-h][1-8])=?(${PROMOTED})?$`)

/** A piece letter typed small, at the start where a piece is named. */
const SMALL_PIECE = new RegExp(`^[${Object.keys(PIECE_OF).join('').toLowerCase()}]`)

/** O-O or O-O-O, written with the letter or the zero, the dashes optional. */
const CASTLING = /^[O0o](-?[O0o]){1,2}$/

const NBSP = '\u00a0'

const quoted = (text: string) => `«${NBSP}${text}${NBSP}»`

/** "a, b ou c", as a sentence lists choices. */
function orList(items: string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ou ${items[items.length - 1]}`
}

interface Candidate {
  from: Square
  to: Square
  piece: PieceSymbol
}

/** Every legal move of the side to move, from the position's own targets. */
function movesOf(position: MovePosition): Candidate[] {
  const moves: Candidate[] = []
  for (const [from, piece] of piecesOf(position.fen)) {
    if (piece.color !== position.turn) continue
    for (const to of position.getLegalTargets(from)) moves.push({ from, to, piece: piece.type })
  }
  return moves
}

/**
 * Why a reading failed. Only text that could not be read, or named no legal
 * move, is worth reading again in another case: an ambiguous move or a
 * promotion without its piece was understood, and needs the player instead.
 */
type Reading = TypedMove | { error: string; respell: boolean }

function impossible(text: string): Reading {
  return { error: `${quoted(text)} n’est pas un coup possible ici.`, respell: true }
}

function withPromotion(
  move: Candidate,
  letter: string | undefined,
  position: MovePosition,
  text: string,
): Reading {
  if (!position.isPromotion(move.from, move.to)) {
    return letter ? impossible(text) : { from: move.from, to: move.to }
  }
  const piece = letter ? PIECE_OF[letter.toUpperCase()] : undefined
  if (!piece) {
    return {
      error: `Précisez la pièce de la promotion${NBSP}: ${orList(
        PROMOTION_LETTERS.map((promoted) => `${move.to}=${promoted}`),
      )}.`,
      respell: false,
    }
  }
  return { from: move.from, to: move.to, promotion: piece }
}

/**
 * How to tell the candidates apart, the way a scoresheet does: by the file
 * they leave from if that is enough, else by the rank, else by the square —
 * listed from the a file and the first rank up, as a reader expects them.
 */
function disambiguated(found: Candidate[], letter: string, capture: boolean): string[] {
  const files = new Set(found.map((move) => move.from[0]))
  const ranks = new Set(found.map((move) => move.from[1]))
  return found
    .map((move) => {
      const which =
        files.size === found.length
          ? move.from[0]
          : ranks.size === found.length
            ? move.from[1]
            : move.from
      return `${letter}${which}${capture ? 'x' : ''}${move.to}`
    })
    .sort()
}

/**
 * The same text in the case it was likely meant in, when it holds a case
 * mistake: a square in capitals, or a piece letter typed small. Text already
 * in the right case is never read again, so an impossible knight move is not
 * answered with a pawn move that happens to share its letters.
 */
function respellings(text: string): string[] {
  const lower = text.toLowerCase()
  const capital = lower.charAt(0).toUpperCase() + lower.slice(1)
  const options = [
    ...(/[A-H][1-8]/.test(text) ? [lower, capital] : []),
    ...(SMALL_PIECE.test(text) ? [capital] : []),
  ]
  return [...new Set(options)].filter((option) => option !== text)
}

/** The text exactly as typed, in the case it was typed in. */
function readExactly(text: string, position: MovePosition, moves: Candidate[]): Reading {
  // A check, a mate, a comment and "en passant" say nothing about the move.
  const plain = text.replace(/[+#!?]+$/, '').replace(/\s*e\.p\.$/, '')

  if (CASTLING.test(plain)) {
    const long = plain.replace(/-/g, '').length === 3
    const rank = position.turn === 'w' ? '1' : '8'
    const from = `e${rank}` as Square
    const to = `${long ? 'c' : 'g'}${rank}` as Square
    const legal = moves.some((move) => move.piece === 'k' && move.from === from && move.to === to)
    return legal ? { from, to } : impossible(text)
  }

  const squares = COORDINATES.exec(plain)
  if (squares) {
    const from = squares[1] as Square
    const to = squares[2] as Square
    const move = moves.find((candidate) => candidate.from === from && candidate.to === to)
    return move ? withPromotion(move, squares[3], position, text) : impossible(text)
  }

  const algebraic = ALGEBRAIC.exec(plain)
  if (!algebraic) {
    return {
      error: `${quoted(text)} ne se lit pas comme un coup${NBSP}: essayez e4, Cf3, O-O ou e2e4.`,
      respell: true,
    }
  }
  const [, letter, file, rank, sign, to, promoted] = algebraic
  const piece = letter ? PIECE_OF[letter]! : 'p'
  const capture = sign === 'x' || sign === ':'
  const found = moves.filter(
    (move) =>
      move.piece === piece &&
      move.to === to &&
      (!rank || move.from[1] === rank) &&
      (file
        ? move.from[0] === file
        : // A pawn named by its square alone pushes up its own file; one that
          // takes comes from the next file, and the capture sign says so.
          piece !== 'p' || (capture ? move.from[0] !== to![0] : move.from[0] === to![0])),
  )
  if (found.length === 0) return impossible(text)
  if (found.length > 1) {
    return {
      error: `${quoted(text)}${NBSP}: plusieurs pièces peuvent y aller. Précisez laquelle${NBSP}: ${orList(
        disambiguated(found, letter ?? '', capture),
      )}.`,
      respell: false,
    }
  }
  return withPromotion(found[0]!, promoted, position, text)
}

/**
 * Reads a move typed into the board's field. In algebraic notation with the
 * French letters — e4, exd5, Cf3, Cbd7, Fxc4, O-O, e8=D — or from square to
 * square — e2e4, e2-e4, e7e8d. Checks, marks and the capture sign may be left
 * out. A piece is a capital and a file a small letter, as a scoresheet writes
 * them, so the bishop F is never the f file, and cxd4 is the c pawn taking.
 *
 * Typed in the other case — cf3, E4 — the move is not played but offered
 * back, spelt right: a guess played on the player's behalf could be a move
 * they never meant, and a guess said aloud costs one more keystroke.
 *
 * It works from the position the board already has, its FEN and its legal
 * targets, rather than from a chess library of its own, so typing a move costs
 * the board nothing to load.
 */
export function readMove(typed: string, position: MovePosition): ReadMove {
  const text = typed.trim()
  if (!text) return { error: 'Tapez un coup, par exemple e4 ou Cf3.' }
  const moves = movesOf(position)
  const reading = readExactly(text, position, moves)
  if (!('error' in reading)) return reading
  if (reading.respell) {
    const respelt = respellings(text).find(
      (option) => !('error' in readExactly(option, position, moves)),
    )
    if (respelt) {
      return {
        error: `${quoted(text)}${NBSP}: vouliez-vous dire ${respelt}${NBSP}? Les pièces s’écrivent en majuscules, les cases en minuscules.`,
      }
    }
  }
  return { error: reading.error }
}
