import { piecesOf } from '@/utils/fen'
import type { Color } from '@/utils/chess'

/** The image's size: four by five, the portrait the networks show uncropped. */
export const WIDTH = 1080
export const HEIGHT = 1350

/** The diagram's square and its place on the page. */
export const BOARD = { x: 150, y: 250, size: 800 } as const
const SQUARE = BOARD.size / 8
/** Pieces are drawn larger than their square and centred, as on the boards (board.css). */
const PIECE_SCALE = 1.18

export interface PlacedPiece {
  /** 'wK', 'bN'…: the name of the piece's drawing in src/assets/pieces/mpchess. */
  piece: string
  x: number
  y: number
  size: number
}

export interface Label {
  text: string
  x: number
  y: number
}

export interface DiagramLayout {
  pieces: PlacedPiece[]
  /** The ranks down the left side and the files along the foot, outside the frame. */
  ranks: Label[]
  files: Label[]
}

const FILES = 'abcdefgh'

/**
 * Where everything on the diagram goes, for `fen` seen from `orientation`'s
 * side: the board printed as the site prints it, a8 top left for White.
 */
export function diagramLayout(fen: string, orientation: Color): DiagramLayout {
  const flipped = orientation === 'b'
  const size = SQUARE * PIECE_SCALE
  const offset = (size - SQUARE) / 2

  const pieces: PlacedPiece[] = []
  for (const [square, piece] of piecesOf(fen)) {
    const file = FILES.indexOf(square[0]!)
    const rank = Number(square[1]) - 1
    const column = flipped ? 7 - file : file
    const row = flipped ? rank : 7 - rank
    pieces.push({
      piece: `${piece.color}${piece.type.toUpperCase()}`,
      x: BOARD.x + column * SQUARE - offset,
      y: BOARD.y + row * SQUARE - offset,
      size,
    })
  }

  const order = (labels: string[]) => (flipped ? [...labels].reverse() : labels)
  const ranks = order(['8', '7', '6', '5', '4', '3', '2', '1']).map((text, row) => ({
    text,
    x: BOARD.x - 26,
    y: BOARD.y + (row + 0.5) * SQUARE,
  }))
  const files = order([...FILES]).map((text, column) => ({
    text,
    x: BOARD.x + (column + 0.5) * SQUARE,
    y: BOARD.y + BOARD.size + 40,
  }))

  return { pieces, ranks, files }
}

/**
 * The caption printed under the diagram, as a column words one: whose move it
 * is, and the move that led there when there was one — "Les Noirs jouent.
 * Après 5.♘g5." The move stays in English SAN here; the painter sets each
 * piece letter as its figurine.
 */
export function diagramCaption(
  fen: string,
  lastMove: { san: string; before: string } | null,
): { sentence: string; lastMove: { san: string; number: string } | null } {
  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  return {
    sentence: turn === 'w' ? 'Les Blancs jouent.' : 'Les Noirs jouent.',
    lastMove: lastMove && { san: lastMove.san, number: moveNumber(lastMove.before) },
  }
}

/** The number a move takes in the score, from the position it was played in: "5." or "5…". */
function moveNumber(before: string): string {
  const [, turn, , , , fullmove] = before.split(' ')
  return `${fullmove ?? '1'}${turn === 'b' ? '…' : '.'}`
}
