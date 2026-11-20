import { describe, expect, it } from 'vitest'
import { BOARD, diagramCaption, diagramLayout } from '@/features/share/diagramLayout'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const SQUARE = BOARD.size / 8

/** The square a piece is drawn on: the column and row its centre falls in. */
function cell(piece: { x: number; y: number; size: number }) {
  return {
    column: Math.floor((piece.x + piece.size / 2 - BOARD.x) / SQUARE),
    row: Math.floor((piece.y + piece.size / 2 - BOARD.y) / SQUARE),
  }
}

describe('diagramLayout', () => {
  it('places every piece, the White king on e1 at the foot for White', () => {
    const { pieces } = diagramLayout(START, 'w')
    expect(pieces).toHaveLength(32)
    const king = pieces.find((placed) => placed.piece === 'wK')!
    expect(cell(king)).toEqual({ column: 4, row: 7 })
  })

  it('turns the board round for Black', () => {
    const king = diagramLayout(START, 'b').pieces.find((placed) => placed.piece === 'wK')!
    expect(cell(king)).toEqual({ column: 3, row: 0 })
  })

  it('draws a piece larger than its square and centred on it, as the boards do', () => {
    const piece = diagramLayout(START, 'w').pieces[0]!
    expect(piece.size).toBeGreaterThan(SQUARE)
    const centre = piece.x + piece.size / 2 - BOARD.x
    expect(centre % SQUARE).toBeCloseTo(SQUARE / 2)
  })

  it('labels the ranks and files from the side the board is seen from', () => {
    const white = diagramLayout(START, 'w')
    expect(white.ranks.map((label) => label.text).join('')).toBe('87654321')
    expect(white.files.map((label) => label.text).join('')).toBe('abcdefgh')
    const black = diagramLayout(START, 'b')
    expect(black.ranks.map((label) => label.text).join('')).toBe('12345678')
    expect(black.files.map((label) => label.text).join('')).toBe('hgfedcba')
  })
})

describe('diagramCaption', () => {
  it('says whose move it is', () => {
    expect(diagramCaption(START, null)).toEqual({ sentence: 'Les Blancs jouent.', lastMove: null })
  })

  it('numbers the move that led there as the score does', () => {
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    expect(diagramCaption(afterE4, { san: 'e4', before: START })).toEqual({
      sentence: 'Les Noirs jouent.',
      lastMove: { san: 'e4', number: '1.' },
    })
    expect(
      diagramCaption(START, { san: 'Nxd5', before: '8/8/8/8/8/8/8/k6K b - - 0 5' }).lastMove,
    ).toEqual({ san: 'Nxd5', number: '5…' })
  })
})
