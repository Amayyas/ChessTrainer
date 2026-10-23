import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { COACH_PROPOSAL, DIAGRAM, SAMPLE_GAME, moveNumber } from '@/features/home/sampleGame'

describe('the landing’s sample game', () => {
  // The diagram's position, its last move and the coach's arrow are written out
  // so the landing does not ship chess.js; these replay the game and fail the
  // moment one of them stops describing it.
  it('ends in the position the diagram shows, on the move it marks', () => {
    const chess = new Chess()
    for (const move of SAMPLE_GAME) chess.move(move.san)
    expect(chess.fen()).toBe(DIAGRAM.fen)
    const last = chess.history({ verbose: true }).at(-1)!
    expect({ from: last.from, to: last.to }).toEqual(DIAGRAM.lastMove)
  })

  it('has the coach propose a legal move, drawn from where it starts to where it goes', () => {
    const proposal = new Chess(DIAGRAM.fen).move(COACH_PROPOSAL.san)
    expect({ san: proposal.san, from: proposal.from, to: proposal.to }).toEqual(COACH_PROPOSAL)
  })

  it('grades the move the caption quotes', () => {
    expect(SAMPLE_GAME.at(-1)!.grade).toBeDefined()
  })

  it('numbers moves as a score prints them', () => {
    expect([0, 1, 8, 9, 10].map(moveNumber)).toEqual(['1.', '1…', '5.', '5…', '6.'])
  })
})
