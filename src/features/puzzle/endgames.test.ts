import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { ENDGAMES, GOAL_LABELS } from '@/features/puzzle/endgames'

describe('ENDGAMES', () => {
  it('names each endgame once', () => {
    const ids = ENDGAMES.map((endgame) => endgame.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(ENDGAMES.map((endgame) => [endgame.id, endgame] as const))(
    '%s starts from a legal position with a game left to play',
    (_id, endgame) => {
      const chess = new Chess(endgame.fen)
      expect(chess.isGameOver()).toBe(false)
      expect(chess.isCheck()).toBe(false)
      expect(endgame.principle.length).toBeGreaterThan(40)
      expect(GOAL_LABELS[endgame.goal]).toBeDefined()
    },
  )

  it.each(ENDGAMES.filter((endgame) => endgame.goal === 'promote').map((e) => [e.id, e] as const))(
    '%s gives the player a pawn to queen',
    (_id, endgame) => {
      const chess = new Chess(endgame.fen)
      const pawns = chess
        .board()
        .flat()
        .filter((square) => square?.type === 'p' && square.color === chess.turn())
      expect(pawns.length).toBeGreaterThan(0)
    },
  )

  it.each(ENDGAMES.filter((endgame) => endgame.goal === 'hold').map((e) => [e.id, e] as const))(
    '%s has the player defending: the other side holds the material edge',
    (_id, endgame) => {
      const chess = new Chess(endgame.fen)
      const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
      const material = (color: 'w' | 'b') =>
        chess
          .board()
          .flat()
          .filter((square) => square?.color === color)
          .reduce((total, square) => total + value[square!.type], 0)
      const player = chess.turn()
      expect(material(player === 'w' ? 'b' : 'w')).toBeGreaterThan(material(player))
    },
  )
})
