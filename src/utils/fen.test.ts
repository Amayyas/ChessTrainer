import { Chess, SQUARES } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { piecesOf } from '@/utils/fen'

describe('piecesOf', () => {
  it('reads every square as chess.js does', () => {
    for (const fen of [
      new Chess().fen(),
      'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
      '8/4P3/8/8/8/8/k7/4K3 w - - 0 1',
    ]) {
      const chess = new Chess(fen)
      const pieces = piecesOf(fen)
      for (const square of SQUARES) {
        const piece = chess.get(square)
        expect(pieces.get(square), `${square} in ${fen}`).toEqual(
          piece ? { type: piece.type, color: piece.color } : undefined,
        )
      }
    }
  })
})
