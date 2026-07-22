import { describe, expect, it } from 'vitest'
import {
  COMBO_WINDOW_MS,
  MAX_COMBO,
  addScore,
  capturePoints,
  encouragement,
  nextCombo,
  personalBest,
  type HuntScoreEntry,
  type Scoreboard,
} from '@/features/hunt/scoring'

const entry = (score: number, captures = 1): HuntScoreEntry => ({
  champion: 'q',
  score,
  captures,
  playedAt: '2026-07-11T10:00:00.000Z',
})

describe('nextCombo', () => {
  it('builds up on quick consecutive captures', () => {
    expect(nextCombo(0, 200)).toBe(1)
    expect(nextCombo(1, 200)).toBe(2)
    expect(nextCombo(2, 200)).toBe(3)
  })

  it('never passes the x4 cap of the specification', () => {
    expect(nextCombo(MAX_COMBO, 100)).toBe(MAX_COMBO)
  })

  it('starts over when the captures are too far apart', () => {
    expect(nextCombo(3, COMBO_WINDOW_MS + 1)).toBe(1)
  })
})

describe('capturePoints', () => {
  it('is worth more for a stronger piece', () => {
    expect(capturePoints('q', 1)).toBeGreaterThan(capturePoints('p', 1))
  })

  it('multiplies by the combo', () => {
    expect(capturePoints('r', 3)).toBe(capturePoints('r', 1) * 3)
  })

  it('treats a zero combo as x1', () => {
    expect(capturePoints('n', 0)).toBe(capturePoints('n', 1))
  })
})

describe('addScore', () => {
  it('keeps only the best five for a piece', () => {
    let board: Scoreboard = {}
    for (const score of [10, 50, 30, 90, 70, 20]) board = addScore(board, entry(score))
    expect(board.q?.map((row) => row.score)).toEqual([90, 70, 50, 30, 20])
  })

  it('keeps a separate table per piece', () => {
    let board: Scoreboard = {}
    board = addScore(board, entry(100))
    board = addScore(board, { ...entry(10), champion: 'n' })
    expect(board.q).toHaveLength(1)
    expect(board.n).toHaveLength(1)
  })

  it('breaks ties on captures', () => {
    let board: Scoreboard = {}
    board = addScore(board, entry(50, 2))
    board = addScore(board, entry(50, 7))
    expect(board.q?.[0]?.captures).toBe(7)
  })
})

describe('personalBest', () => {
  it('is zero without a recorded round', () => {
    expect(personalBest({}, 'k')).toBe(0)
  })

  it('returns the top score for that piece', () => {
    const board = addScore(addScore({}, entry(40)), entry(120))
    expect(personalBest(board, 'q')).toBe(120)
  })
})

describe('encouragement', () => {
  it('nudges a player who captured nothing', () => {
    expect(encouragement(0, 0, 0)).toMatch(/repérer/)
  })

  it('celebrates a personal best', () => {
    expect(encouragement(150, 100, 5)).toMatch(/record/)
  })

  it('stays positive after a modest round', () => {
    expect(encouragement(10, 500, 1)).toMatch(/combo/)
  })
})
