import { describe, expect, it } from 'vitest'
import { readResume } from '@/features/battle/resume'

// After 1.e4 e5 2.Qh5 Nc6 3.Bc4: Black to move, and 3…Nf6?? loses at once.
const BEFORE_BLUNDER = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'

describe('readResume', () => {
  it('reads a resume that holds together', () => {
    const resume = { fen: BEFORE_BLUNDER, color: 'b', san: 'Nf6', levelId: 2 }
    expect(readResume({ resume })).toEqual(resume)
  })

  it('keeps the position but drops a level that is not on the ladder', () => {
    expect(
      readResume({ resume: { fen: BEFORE_BLUNDER, color: 'b', san: 'Nf6', levelId: 9 } }),
    ).toEqual({ fen: BEFORE_BLUNDER, color: 'b', san: 'Nf6' })
  })

  it.each([
    ['no state at all', null],
    ['state from another page', { pgn: '1. e4' }],
    ['a position that does not load', { resume: { fen: 'not a fen', color: 'b', san: 'Nf6' } }],
    ['the side not to move', { resume: { fen: BEFORE_BLUNDER, color: 'w', san: 'Nf6' } }],
    [
      'a mistake that is not legal there',
      { resume: { fen: BEFORE_BLUNDER, color: 'b', san: 'Nf3' } },
    ],
    [
      'a finished game',
      // Fool's mate: White is mated, nothing is left to play.
      {
        resume: {
          fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
          color: 'w',
          san: 'a3',
        },
      },
    ],
  ])('turns away %s', (_case, state) => {
    expect(readResume(state)).toBeNull()
  })
})
