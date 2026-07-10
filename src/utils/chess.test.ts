import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { createGame, describeStatus, findKingSquare, getGameStatus } from '@/utils/chess'

describe('getGameStatus', () => {
  it('reports an ongoing game', () => {
    const status = getGameStatus(new Chess())
    expect(status).toMatchObject({ isOver: false, isCheck: false, winner: null, reason: null })
  })

  it('reports checkmate with the winning side', () => {
    // Black is checkmated (fool's mate), white wins.
    const chess = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')
    const status = getGameStatus(chess)
    expect(status.isOver).toBe(true)
    expect(status.reason).toBe('checkmate')
    expect(status.winner).toBe('b')
  })

  it('reports stalemate as a draw', () => {
    const chess = new Chess('k7/8/1Q6/8/8/8/8/7K b - - 0 1')
    const status = getGameStatus(chess)
    expect(status.isOver).toBe(true)
    expect(status.reason).toBe('stalemate')
    expect(status.winner).toBeNull()
  })

  it('reports insufficient material', () => {
    const status = getGameStatus(new Chess('8/8/8/4k3/8/8/4K3/8 w - - 0 1'))
    expect(status.reason).toBe('insufficient')
  })
})

describe('findKingSquare', () => {
  it('locates each king', () => {
    const chess = new Chess()
    expect(findKingSquare(chess, 'w')).toBe('e1')
    expect(findKingSquare(chess, 'b')).toBe('e8')
  })
})

describe('describeStatus', () => {
  it('describes whose turn it is', () => {
    expect(describeStatus(getGameStatus(new Chess()), 'w')).toBe('Trait aux blancs')
  })

  it('announces checkmate for the winner', () => {
    const chess = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')
    expect(describeStatus(getGameStatus(chess), chess.turn())).toContain('Échec et mat')
  })
})

describe('createGame', () => {
  it('returns a game for a valid FEN', () => {
    expect(createGame()).not.toBeNull()
    expect(createGame('8/8/8/4k3/8/8/4K3/8 w - - 0 1')).not.toBeNull()
  })

  it('returns null for an invalid FEN', () => {
    expect(createGame('not-a-fen')).toBeNull()
  })
})
