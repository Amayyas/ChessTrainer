import type { Color, PieceSymbol, Square } from '@/utils/chess'
import { piecesOf, type PlacedPiece } from '@/utils/fen'

/**
 * The board in words, for a screen reader: chessground draws it as a picture
 * with no element per square, so without this a player who cannot see it had
 * the move list and nothing else to tell where the pieces stood.
 */

/** Each piece's name, singular and plural, in the order a scoresheet lists them. */
export const PIECE_NAMES: ReadonlyArray<[PieceSymbol, string, string]> = [
  ['k', 'Roi', 'Rois'],
  ['q', 'Dame', 'Dames'],
  ['r', 'Tour', 'Tours'],
  ['b', 'Fou', 'Fous'],
  ['n', 'Cavalier', 'Cavaliers'],
  ['p', 'Pion', 'Pions'],
]

const NAME = Object.fromEntries(PIECE_NAMES.map(([type, name]) => [type, name])) as Record<
  PieceSymbol,
  string
>

const SIDE: Record<Color, string> = { w: 'blancs', b: 'noirs' }

/** The pieces whose name is feminine, for the words that agree with it. */
const FEMININE = new Set<PieceSymbol>(['q', 'r'])

/** "a, b et c", as a sentence lists things. */
function andList(items: string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

/** Squares in reading order along the files: a1, a2, … h8. */
const byFile = (a: Square, b: Square) => a.localeCompare(b)

/** One side's pieces: "Roi g1 ; Tours a1 et h1 ; Pions a2, b2 et c2". */
function sideInWords(pieces: Map<Square, PlacedPiece>, color: Color): string {
  const groups = PIECE_NAMES.flatMap(([type, one, many]) => {
    const squares = [...pieces]
      .filter(([, piece]) => piece.color === color && piece.type === type)
      .map(([square]) => square)
      .sort(byFile)
    if (squares.length === 0) return []
    return [`${squares.length > 1 ? many : one} ${andList(squares)}`]
  })
  return groups.length ? groups.join(' ; ') : 'aucune pièce'
}

/**
 * The position, side by side and piece by piece, then whose move it is:
 * "Blancs : Roi g1 ; Dame d1 … Noirs : … Trait aux blancs."
 */
export function describePosition(fen: string): string {
  const pieces = piecesOf(fen)
  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  return (
    `Blancs : ${sideInWords(pieces, 'w')}. Noirs : ${sideInWords(pieces, 'b')}. ` +
    `Trait aux ${SIDE[turn]}.`
  )
}

/** What describeMove needs of a move: chess.js's verbose move has all of it. */
export interface SpokenMove {
  color: Color
  piece: PieceSymbol
  from: Square
  to: Square
  san: string
  flags: string
  captured?: PieceSymbol
  promotion?: PieceSymbol
}

/**
 * A move as it is said: "Les noirs jouent Cavalier de g8 en f6", with what it
 * takes, castling, en passant, a promotion, and a check or a mate.
 */
export function describeMove(move: SpokenMove): string {
  const side = `Les ${SIDE[move.color]}`
  const check = move.san.endsWith('#') ? ', échec et mat' : move.san.endsWith('+') ? ', échec' : ''
  if (move.flags.includes('k') || move.flags.includes('q')) {
    return `${side} roquent ${move.flags.includes('k') ? 'côté roi' : 'côté dame'}${check}`
  }
  const taken = move.flags.includes('e')
    ? ', prend le pion en passant'
    : move.captured
      ? `, prend ${NAME[move.captured]} ${move.to}`
      : ''
  const promotion = move.promotion ? `, promu ${NAME[move.promotion]}` : ''
  return `${side} jouent ${NAME[move.piece]} de ${move.from} en ${move.to}${taken}${promotion}${check}`
}

/** One move and the same move: the same notation from the same square. */
const sameMove = (a: SpokenMove, b: SpokenMove) => a.san === b.san && a.from === b.from

/** The same moves, as a page hands them over anew at each render. */
export function sameMoves(a: ReadonlyArray<SpokenMove>, b: ReadonlyArray<SpokenMove>): boolean {
  return a.length === b.length && a.every((move, index) => sameMove(move, b[index]!))
}

/**
 * What to say when the moves played go from `before` to `after`: the moves
 * added, one or two of them, as a move and its reply arrive together; only the
 * last when more arrive at once, as a replay jumping to its end; nothing when
 * moves were taken back, as an undo or a step back through a replay.
 */
export function describeNewMoves(
  before: ReadonlyArray<SpokenMove>,
  after: ReadonlyArray<SpokenMove>,
): string | null {
  if (after.length <= before.length) return null
  if (!before.every((move, index) => sameMove(move, after[index]!))) return null
  const added = after.slice(before.length)
  const said = added.length > 2 ? added.slice(-1) : added
  return said.map((move) => `${describeMove(move)}.`).join(' ')
}

/** The pieces that can take the champion: "En danger : Tour b3 peut vous prendre." */
export function describeThreats(enemies: ReadonlyMap<string, PieceSymbol>, threats: string[]) {
  const named = [...threats]
    .filter((square) => enemies.has(square))
    .sort()
    .map((square) => `${NAME[enemies.get(square)!]} ${square}`)
  if (named.length === 0) return ''
  return named.length === 1
    ? `En danger : ${named[0]} peut vous prendre.`
    : `En danger : ${andList(named)} peuvent vous prendre.`
}

/** The champion taken: "Votre Dame a été prise et reparaît dans un instant." */
export function describeTaken(champion: PieceSymbol): string {
  return `Votre ${NAME[champion]} a été ${FEMININE.has(champion) ? 'prise' : 'pris'} et reparaît dans un instant.`
}

/**
 * The Piece Hunt's board in words: where the champion stands, the enemies by
 * kind, and the ones that can take it.
 */
export function describeHunt(
  champion: PieceSymbol,
  championSquare: string | null,
  enemies: ReadonlyMap<string, PieceSymbol>,
  threats: string[],
): string {
  const placed = new Map<Square, PlacedPiece>(
    [...enemies].map(([square, type]) => [square as Square, { type, color: 'b' }]),
  )
  const where = championSquare
    ? `Votre ${NAME[champion]} est en ${championSquare}.`
    : describeTaken(champion)
  const danger = describeThreats(enemies, threats)
  return `${where} Pièces ennemies : ${sideInWords(placed, 'b')}.${danger ? ` ${danger}` : ''}`
}
