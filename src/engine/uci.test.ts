import { describe, expect, it } from 'vitest'
import { parseBestMove, parseInfo, parseUciMove } from '@/engine/uci'

describe('parseInfo', () => {
  it('parses a centipawn evaluation line with a principal variation', () => {
    const info = parseInfo(
      'info depth 15 seldepth 20 multipv 1 score cp 34 nodes 100 nps 1000 time 12 pv e2e4 e7e5 g1f3',
    )
    expect(info).toEqual({ depth: 15, scoreCp: 34, scoreMate: null, pv: ['e2e4', 'e7e5', 'g1f3'] })
  })

  it('parses a mate evaluation line', () => {
    const info = parseInfo('info depth 10 score mate 3 pv d1h5 g6h5')
    expect(info).toMatchObject({ depth: 10, scoreCp: null, scoreMate: 3 })
  })

  it('parses a negative centipawn score', () => {
    expect(parseInfo('info depth 8 score cp -120 pv a2a4')?.scoreCp).toBe(-120)
  })

  it('returns null for lines without depth and score', () => {
    expect(parseInfo('info string NNUE evaluation using ...')).toBeNull()
    expect(parseInfo('bestmove e2e4')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('extracts the best move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
    expect(parseBestMove('bestmove g1f3')).toBe('g1f3')
  })

  it('reports when there is no move', () => {
    expect(parseBestMove('bestmove (none)')).toBe('(none)')
  })

  it('returns null for non-bestmove lines', () => {
    expect(parseBestMove('info depth 1 score cp 0')).toBeNull()
  })
})

describe('parseUciMove', () => {
  it('splits a plain move', () => {
    expect(parseUciMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined })
  })

  it('splits a promotion move', () => {
    expect(parseUciMove('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
  })

  it('returns null for malformed input', () => {
    expect(parseUciMove('e2')).toBeNull()
  })
})
