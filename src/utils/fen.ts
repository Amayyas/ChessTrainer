import type { Color, PieceSymbol, Square } from '@/utils/chess'

/** A piece where a FEN sets it down. */
export interface PlacedPiece {
  type: PieceSymbol
  color: Color
}

/**
 * The pieces a FEN places, square by square, read from its text alone — so
 * the board knows what stands where without loading a chess library.
 */
export function piecesOf(fen: string): Map<Square, PlacedPiece> {
  const pieces = new Map<Square, PlacedPiece>()
  const rows = (fen.split(' ')[0] ?? '').split('/')
  rows.forEach((row, index) => {
    let file = 0
    for (const char of row) {
      if (/\d/.test(char)) {
        file += Number(char)
        continue
      }
      const lower = char.toLowerCase()
      pieces.set(`${'abcdefgh'[file]}${8 - index}` as Square, {
        type: lower as PieceSymbol,
        color: char === lower ? 'b' : 'w',
      })
      file += 1
    }
  })
  return pieces
}
