import { describe, expect, it } from 'vitest'
import {
  ALL_SQUARES,
  attackedSquares,
  championMoves,
  fromSquare,
  isInDanger,
  respawnSquare,
  safeSquares,
  spawnSquareFor,
  threateningEnemies,
  toSquare,
  type EnemyType,
} from '@/features/hunt/board'

const board = (entries: Record<string, EnemyType>) => new Map(Object.entries(entries))

describe('square helpers', () => {
  it('round-trips a square', () => {
    expect(toSquare(0, 0)).toBe('a1')
    expect(toSquare(7, 7)).toBe('h8')
    expect(fromSquare('e4')).toEqual({ file: 4, rank: 3 })
  })

  it('covers the whole board exactly once', () => {
    expect(ALL_SQUARES).toHaveLength(64)
    expect(new Set(ALL_SQUARES).size).toBe(64)
  })
})

describe('attackedSquares', () => {
  it('gives a knight its eight jumps from the centre, fewer from a corner', () => {
    expect(attackedSquares('n', 'd4')).toHaveLength(8)
    expect(attackedSquares('n', 'a1').sort()).toEqual(['b3', 'c2'])
  })

  it('gives a king eight neighbours in the centre', () => {
    expect(attackedSquares('k', 'd4').sort()).toEqual(
      ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'].sort(),
    )
  })

  it('sweeps a rook along its file and rank', () => {
    const squares = attackedSquares('r', 'a1')
    expect(squares).toHaveLength(14)
    expect(squares).toContain('a8')
    expect(squares).toContain('h1')
    expect(squares).not.toContain('b2')
  })

  it('stops a slider at the first occupied square but still covers it', () => {
    const squares = attackedSquares('r', 'a1', new Set(['a4']))
    expect(squares).toContain('a4')
    expect(squares).not.toContain('a5')
  })

  it('has a black pawn attack diagonally downwards', () => {
    expect(attackedSquares('p', 'd5').sort()).toEqual(['c4', 'e4'])
  })
})

describe('championMoves', () => {
  it('lets the champion land on an enemy to capture it', () => {
    const moves = championMoves('r', 'a1', board({ a4: 'n' }))
    expect(moves).toContain('a4')
    expect(moves).not.toContain('a5')
  })

  it('lets a knight jump over an enemy', () => {
    const moves = championMoves('n', 'd4', board({ d5: 'q', e5: 'r' }))
    expect(moves).toContain('e6')
  })
})

describe('danger detection', () => {
  it('spots the enemy that could capture the champion', () => {
    expect(threateningEnemies('d4', board({ d8: 'r' }))).toEqual(['d8'])
    expect(isInDanger('d4', board({ d8: 'r' }))).toBe(true)
  })

  it('sees a blocked line as safe', () => {
    // Another enemy sits between the rook and the champion.
    expect(isInDanger('d4', board({ d8: 'r', d6: 'p' }))).toBe(false)
  })

  it('reports safety on an empty board', () => {
    expect(isInDanger('d4', board({}))).toBe(false)
  })
})

describe('safeSquares and respawnSquare', () => {
  it('excludes enemy squares and everything they cover', () => {
    const enemies = board({ d4: 'q' })
    const safe = safeSquares(enemies)
    expect(safe).not.toContain('d4')
    expect(safe).not.toContain('d8')
    expect(safe).not.toContain('a1')
    expect(safe).toContain('b3')
  })

  it('respawns on a square no enemy covers', () => {
    const enemies = board({ d4: 'q', h8: 'n' })
    const square = respawnSquare(enemies, () => 0.5)!
    expect(safeSquares(enemies)).toContain(square)
  })

  it('still finds a free square when everything is covered', () => {
    // Eight queens covering the board: no safe square, but a free one exists.
    const enemies = board({
      a1: 'q',
      b2: 'q',
      c3: 'q',
      d4: 'q',
      e5: 'q',
      f6: 'q',
      g7: 'q',
      h8: 'q',
    })
    const square = respawnSquare(enemies, () => 0.5)
    expect(square).not.toBeNull()
    expect(enemies.has(square!)).toBe(false)
  })
})

describe('spawnSquareFor', () => {
  it('never spawns an enemy that already attacks the champion', () => {
    const enemies = board({})
    for (let i = 0; i < 200; i += 1) {
      const square = spawnSquareFor('q', enemies, 'd4')!
      expect(square).not.toBe('d4')
      expect(attackedSquares('q', square, new Set(['d4', square]))).not.toContain('d4')
    }
  })

  it('never spawns on an occupied square', () => {
    const enemies = board({ a1: 'r', h8: 'n' })
    for (let i = 0; i < 100; i += 1) {
      const square = spawnSquareFor('n', enemies, 'd4')!
      expect(['a1', 'h8', 'd4']).not.toContain(square)
    }
  })
})
