import { Chess, SQUARES } from 'chess.js'
import { describe, expect, it } from 'vitest'
import {
  PIECE_NAMES,
  describeHunt,
  describeMove,
  describeNewMoves,
  describePosition,
  describeTaken,
  describeThreats,
  sameMoves,
} from '@/utils/describeBoard'

const START = new Chess().fen()

describe('describePosition', () => {
  it('reads the opening position side by side, piece by piece', () => {
    expect(describePosition(START)).toBe(
      'Blancs : Roi e1 ; Dame d1 ; Tours a1 et h1 ; Fous c1 et f1 ; Cavaliers b1 et g1 ; ' +
        'Pions a2, b2, c2, d2, e2, f2, g2 et h2. ' +
        'Noirs : Roi e8 ; Dame d8 ; Tours a8 et h8 ; Fous c8 et f8 ; Cavaliers b8 et g8 ; ' +
        'Pions a7, b7, c7, d7, e7, f7, g7 et h7. Trait aux blancs.',
    )
  })

  it('names every piece chess.js sees, on its square, and no other', () => {
    // A middlegame with every kind of piece, read back square by square.
    const fen = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R2QKB1R b KQ - 3 8'
    const text = describePosition(fen)
    const chess = new Chess(fen)
    const named = SQUARES.filter((square) => new RegExp(`\\b${square}\\b`).test(text))
    expect(named.sort()).toEqual(SQUARES.filter((square) => chess.get(square)).sort())
    expect(text).toMatch(/Trait aux noirs\.$/)
  })

  it('says a side with nothing left has nothing', () => {
    expect(describePosition('8/8/8/8/8/8/8/K7 w - - 0 1')).toContain('Noirs : aucune pièce.')
  })
})

/** The moves chess.js plays from a position, verbose, as the pages hand them over. */
function moves(fen: string, ...sans: string[]) {
  const chess = new Chess(fen)
  for (const san of sans) chess.move(san)
  return chess.history({ verbose: true })
}

describe('describeMove', () => {
  it('says who moved what from where to where', () => {
    expect(describeMove(moves(START, 'Nf3')[0]!)).toBe('Les blancs jouent Cavalier de g1 en f3')
  })

  it('says what a move takes', () => {
    const [, , take] = moves(START, 'e4', 'd5', 'exd5')
    expect(describeMove(take!)).toBe('Les blancs jouent Pion de e4 en d5, prend Pion d5')
  })

  it('says a pawn taken en passant', () => {
    const [take] = moves('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', 'exd6')
    expect(describeMove(take!)).toBe('Les blancs jouent Pion de e5 en d6, prend le pion en passant')
  })

  it('says castling on either wing', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1'
    expect(describeMove(moves(fen, 'O-O')[0]!)).toBe('Les noirs roquent côté roi')
    expect(describeMove(moves(fen, 'O-O-O')[0]!)).toBe('Les noirs roquent côté dame')
  })

  it('says the piece a pawn becomes', () => {
    const [promote] = moves('1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'axb8=N')
    expect(describeMove(promote!)).toBe(
      'Les blancs jouent Pion de a7 en b8, prend Cavalier b8, promu Cavalier',
    )
  })

  it('says a check, and a mate as a mate', () => {
    const mate = moves(START, 'f3', 'e5', 'g4', 'Qh4#').at(-1)!
    expect(describeMove(mate)).toBe('Les noirs jouent Dame de d8 en h4, échec et mat')
    const [checking] = moves('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'Ra8+')
    expect(describeMove(checking!)).toBe('Les blancs jouent Tour de a1 en a8, échec')
  })

  it('has a name for every piece', () => {
    expect(PIECE_NAMES.map(([type]) => type).sort()).toEqual(['b', 'k', 'n', 'p', 'q', 'r'])
  })
})

describe('describeNewMoves', () => {
  const game = moves(START, 'e4', 'e5', 'Nf3', 'Nc6', 'Bb5')

  it('says the move just played', () => {
    expect(describeNewMoves(game.slice(0, 2), game.slice(0, 3))).toBe(
      'Les blancs jouent Cavalier de g1 en f3.',
    )
  })

  it('says a move and its reply when they arrive together, as in a puzzle', () => {
    expect(describeNewMoves(game.slice(0, 1), game.slice(0, 3))).toBe(
      'Les noirs jouent Pion de e7 en e5. Les blancs jouent Cavalier de g1 en f3.',
    )
  })

  it('says only the last when more arrive at once, as a replay jumping to its end', () => {
    expect(describeNewMoves([], game)).toBe('Les blancs jouent Fou de f1 en b5.')
  })

  it('tells the same moves from a game that only reads the same', () => {
    expect(sameMoves(game, [...game])).toBe(true)
    expect(sameMoves(game, game.slice(0, 4))).toBe(false)
    // Nf3 from g1, then the same notation from another square.
    const elsewhere = game.map((move, index) =>
      index === 2 ? { ...move, from: 'e1' as const } : move,
    )
    expect(sameMoves(game, elsewhere)).toBe(false)
  })

  it('says nothing when moves are taken back, or the game is another one', () => {
    expect(describeNewMoves(game, game.slice(0, 3))).toBeNull()
    expect(describeNewMoves(game, game)).toBeNull()
    expect(describeNewMoves(moves(START, 'd4'), game.slice(0, 2))).toBeNull()
  })
})

describe('describeHunt', () => {
  const enemies = new Map([
    ['b3', 'r'],
    ['c5', 'n'],
    ['e8', 'n'],
  ] as const)

  it('says where the champion stands and the enemies by kind', () => {
    expect(describeHunt('q', 'd4', enemies, [])).toBe(
      'Votre Dame est en d4. Pièces ennemies : Tour b3 ; Cavaliers c5 et e8.',
    )
  })

  it('names the enemies that can take the champion', () => {
    expect(describeThreats(enemies, ['b3'])).toBe('En danger : Tour b3 peut vous prendre.')
    expect(describeThreats(enemies, ['e8', 'b3'])).toBe(
      'En danger : Tour b3 et Cavalier e8 peuvent vous prendre.',
    )
    expect(describeHunt('q', 'd4', enemies, ['b3'])).toMatch(/ En danger : Tour b3 /)
    expect(describeThreats(enemies, [])).toBe('')
    // A square no enemy stands on names no piece, rather than "undefined".
    expect(describeThreats(enemies, ['h1', 'b3'])).toBe('En danger : Tour b3 peut vous prendre.')
  })

  it('says the champion is gone while it reappears', () => {
    expect(describeHunt('n', null, enemies, [])).toMatch(/^Votre Cavalier a été pris et/)
    expect(describeHunt('q', null, enemies, [])).toMatch(/^Votre Dame a été prise et/)
    expect(describeHunt('q', null, enemies, [])).toMatch(new RegExp(`^${describeTaken('q')} `))
  })
})
