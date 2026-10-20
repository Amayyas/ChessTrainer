import { Chess, type Move } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { readMove, type MovePosition, type ReadMove } from '@/utils/moveText'
import { FRENCH_LETTERS, type PieceLetter } from '@/utils/notation'

/** A position as the board hands it over, from a chess.js game. */
function positionOf(fen: string): MovePosition & { moves: Move[] } {
  const chess = new Chess(fen)
  return {
    moves: chess.moves({ verbose: true }),
    fen: chess.fen(),
    turn: chess.turn(),
    getLegalTargets: (square) => [
      ...new Set(chess.moves({ square, verbose: true }).map((move) => move.to)),
    ],
    isPromotion: (from, to) =>
      chess
        .moves({ square: from, verbose: true })
        .some((move) => move.to === to && Boolean(move.promotion)),
  }
}

/** chess.js's SAN with its English piece letters swapped for the French ones. */
function french(san: string): string {
  return san.replace(/[KQRBN]/g, (letter) => FRENCH_LETTERS[letter as PieceLetter])
}

/** The move chess.js made, in the shape readMove returns it. */
function expected(move: Move): ReadMove {
  return move.promotion
    ? { from: move.from, to: move.to, promotion: move.promotion }
    : { from: move.from, to: move.to }
}

/** The sentence said to the player, its non-breaking spaces made plain. */
function said(result: ReadMove): string {
  return 'error' in result
    ? result.error.replace(/\u00a0/g, ' ')
    : `played ${JSON.stringify(result)}`
}

const START = new Chess().fen()

/**
 * Positions that hold every kind of move: castling on both wings, two knights
 * and two rooks able to reach one square, three queens that need the whole
 * square, promotions by push and by capture, and en passant.
 */
const POSITIONS = {
  start: START,
  italian: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R3K2R w KQkq - 4 5',
  twoKnights: '4k3/8/8/8/8/2N3N1/8/4K3 w - - 0 1',
  twoRooks: '4k3/8/8/R7/8/8/8/R3K3 w - - 0 1',
  threeQueens: '7k/8/8/8/8/Q7/8/Q1Q1K3 w - - 0 1',
  promotion: '1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1',
  blackPromotion: '4k3/8/8/8/8/8/p7/1N2K3 b - - 0 1',
  enPassant: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
  blackCastles: 'r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1',
  twoPawns: '4k3/8/8/3p4/2P1P3/8/8/4K3 w - - 0 1',
}

describe('readMove reads every legal move as chess.js writes it', () => {
  for (const [name, fen] of Object.entries(POSITIONS)) {
    it(`in French algebraic notation (${name})`, () => {
      const position = positionOf(fen)
      expect(position.moves.length).toBeGreaterThan(0)
      for (const move of position.moves) {
        expect(readMove(french(move.san), position), move.san).toEqual(expected(move))
      }
    })

    it(`from square to square (${name})`, () => {
      const position = positionOf(fen)
      for (const move of position.moves) {
        const letter = move.promotion
          ? FRENCH_LETTERS[move.promotion.toUpperCase() as PieceLetter].toLowerCase()
          : ''
        expect(readMove(`${move.from}${move.to}${letter}`, position), move.lan).toEqual(
          expected(move),
        )
      }
    })

    it(`without the capture sign or the check (${name})`, () => {
      const position = positionOf(fen)
      for (const move of position.moves) {
        const bare = french(move.san).replace(/[x+#]/g, '')
        // A pawn taking keeps its file: without the sign it still says which.
        expect(readMove(bare, position), bare).toEqual(expected(move))
      }
    })
  }
})

describe('readMove, written in other ways', () => {
  it('takes castling with the letter, the zero or no dash', () => {
    const position = positionOf(POSITIONS.blackCastles)
    for (const typed of ['O-O', '0-0', 'o-o', 'OO']) {
      expect(readMove(typed, position), typed).toEqual({ from: 'e8', to: 'g8' })
    }
    for (const typed of ['O-O-O', '0-0-0', 'OOO']) {
      expect(readMove(typed, position), typed).toEqual({ from: 'e8', to: 'c8' })
    }
  })

  it('takes a dash between the squares, and the marks a move is annotated with', () => {
    const position = positionOf(START)
    expect(readMove('e2-e4', position)).toEqual({ from: 'e2', to: 'e4' })
    expect(readMove('  Cf3!? ', position)).toEqual({ from: 'g1', to: 'f3' })
    expect(readMove('Cg1-f3', position)).toEqual({ from: 'g1', to: 'f3' })
    expect(readMove('exd6 e.p.', positionOf(POSITIONS.enPassant))).toEqual({
      from: 'e5',
      to: 'd6',
    })
  })

  it('moves a pawn named by its square alone up its own file, and one that takes by the sign', () => {
    // The e pawn takes on d6 en passant. Named by the square alone, the move
    // would be a d pawn's push, and there is none; with the sign, it is the e
    // pawn's capture.
    const position = positionOf(POSITIONS.enPassant)
    expect(said(readMove('d6', position))).toBe('« d6 » n’est pas un coup possible ici.')
    expect(readMove('xd6', position)).toEqual({ from: 'e5', to: 'd6' })
  })

  it('takes the piece a pawn becomes in either case, with or without the sign', () => {
    const position = positionOf(POSITIONS.promotion)
    for (const typed of ['a8=D', 'a8D', 'a8=d', 'a7a8d', 'a7a8=D']) {
      expect(readMove(typed, position), typed).toEqual({ from: 'a7', to: 'a8', promotion: 'q' })
    }
    expect(readMove('axb8=C', position)).toEqual({ from: 'a7', to: 'b8', promotion: 'n' })
  })
})

describe('readMove says why it played nothing', () => {
  it('asks for a move when the field is empty', () => {
    expect(said(readMove('  ', positionOf(START)))).toBe('Tapez un coup, par exemple e4 ou Cf3.')
  })

  it('says text that is no move cannot be read, with examples', () => {
    expect(said(readMove('Zz9', positionOf(START)))).toBe(
      '« Zz9 » ne se lit pas comme un coup : essayez e4, Cf3, O-O ou e2e4.',
    )
  })

  it('says a move the position does not allow is not possible', () => {
    const position = positionOf(START)
    for (const typed of ['Cf6', 'e5', 'e2e5', 'O-O', 'e4=D']) {
      expect(said(readMove(typed, position)), typed).toBe(
        `« ${typed} » n’est pas un coup possible ici.`,
      )
    }
  })

  it('asks which piece, by its file, its rank or its square', () => {
    expect(said(readMove('Ce4', positionOf(POSITIONS.twoKnights)))).toBe(
      '« Ce4 » : plusieurs pièces peuvent y aller. Précisez laquelle : Cce4 ou Cge4.',
    )
    expect(said(readMove('Ta3', positionOf(POSITIONS.twoRooks)))).toBe(
      '« Ta3 » : plusieurs pièces peuvent y aller. Précisez laquelle : T1a3 ou T5a3.',
    )
    expect(said(readMove('Db2', positionOf(POSITIONS.threeQueens)))).toBe(
      '« Db2 » : plusieurs pièces peuvent y aller. Précisez laquelle : Da1b2, Da3b2 ou Dc1b2.',
    )
    expect(said(readMove('xd5', positionOf(POSITIONS.twoPawns)))).toBe(
      '« xd5 » : plusieurs pièces peuvent y aller. Précisez laquelle : cxd5 ou exd5.',
    )
  })

  it('asks for the piece a pawn becomes', () => {
    expect(said(readMove('a8', positionOf(POSITIONS.promotion)))).toBe(
      'Précisez la pièce de la promotion : a8=D, a8=T, a8=F ou a8=C.',
    )
  })

  it('offers a move typed in the wrong case back, spelt right, rather than playing it', () => {
    const position = positionOf(START)
    const advice = 'Les pièces s’écrivent en majuscules, les cases en minuscules.'
    expect(said(readMove('cf3', position))).toBe(`« cf3 » : vouliez-vous dire Cf3 ? ${advice}`)
    expect(said(readMove('CF3', position))).toBe(`« CF3 » : vouliez-vous dire Cf3 ? ${advice}`)
    expect(said(readMove('E4', position))).toBe(`« E4 » : vouliez-vous dire e4 ? ${advice}`)
    expect(said(readMove('E2E4', position))).toBe(`« E2E4 » : vouliez-vous dire e2e4 ? ${advice}`)
  })

  it('reads text already in the right case once, and offers nothing else', () => {
    // The c pawn could take on d4, but Cd4 names a knight, in the right case:
    // it is not possible, and the pawn's move is not offered in its place.
    const position = positionOf('4k3/8/8/8/3p4/2P5/8/4K3 w - - 0 1')
    expect(readMove('cd4', position)).toEqual({ from: 'c3', to: 'd4' })
    expect(said(readMove('Cd4', position))).toBe('« Cd4 » n’est pas un coup possible ici.')
  })
})
