import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import {
  MISTAKES_CAP,
  REVIEW_INTERVALS,
  addDays,
  addMistakes,
  duePuzzles,
  mergeMistakes,
  positionId,
  reviewMistake,
  type MistakePuzzle,
} from '@/features/puzzle/mistakes'
import { collectMistakes, isPlayable, type Insight } from '@/features/puzzle/collectMistakes'
import type { MoveQuality } from '@/utils/evaluation'

const puzzle = (id: string, overrides: Partial<MistakePuzzle> = {}): MistakePuzzle => ({
  id,
  fen: `${id} w - -`,
  best: 'e2e4',
  bestEval: { cp: 30, mate: null },
  played: 'a3',
  createdAt: '2026-11-01T10:00:00.000Z',
  due: '2026-11-21',
  streak: 0,
  ...overrides,
})

describe('the review schedule', () => {
  it('counts days across a month', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-11-20', 21)).toBe('2026-12-11')
  })

  it('offers what is due, the longest overdue first', () => {
    const list = [
      puzzle('a', { due: '2026-11-22' }),
      puzzle('b', { due: '2026-11-18' }),
      puzzle('c'),
    ]
    expect(duePuzzles(list, '2026-11-21').map((p) => p.id)).toEqual(['b', 'c'])
  })

  it('spaces a solved mistake further each time, then lets it go', () => {
    let list = [puzzle('a')]
    for (let step = 1; step < REVIEW_INTERVALS.length; step += 1) {
      list = reviewMistake(list, 'a', true, '2026-11-21')
      expect(list[0]).toEqual(
        expect.objectContaining({
          streak: step,
          due: addDays('2026-11-21', REVIEW_INTERVALS[step]!),
        }),
      )
    }
    expect(reviewMistake(list, 'a', true, '2026-11-21')).toEqual([])
  })

  it('brings a missed mistake back the next day, from the start', () => {
    const list = reviewMistake([puzzle('a', { streak: 3 })], 'a', false, '2026-11-21')
    expect(list[0]).toEqual(expect.objectContaining({ streak: 0, due: '2026-11-22' }))
  })
})

describe('the list', () => {
  it('adds a position once, keeping the schedule of one already in it', () => {
    const known = puzzle('a', { streak: 2, due: '2026-12-01' })
    const list = addMistakes([known], [puzzle('a'), puzzle('b'), puzzle('b')])
    expect(list.map((p) => p.id)).toEqual(['a', 'b'])
    expect(list[0]).toBe(known)
  })

  it('keeps the newest past the cap', () => {
    const many = Array.from({ length: MISTAKES_CAP + 5 }, (_, i) =>
      puzzle(`p${i}`, { createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() }),
    )
    const list = addMistakes([], many)
    expect(list).toHaveLength(MISTAKES_CAP)
    expect(list[0]!.id).toBe('p5')
  })

  it('merges two devices, the review further along winning', () => {
    const merged = mergeMistakes(
      [puzzle('a', { due: '2026-11-30', streak: 2 }), puzzle('b')],
      [puzzle('a', { due: '2026-11-22', streak: 1 }), puzzle('c')],
    )
    expect(merged.map((p) => p.id).sort()).toEqual(['a', 'b', 'c'])
    expect(merged.find((p) => p.id === 'a')!.streak).toBe(2)

    // And the other way round: the server's copy, further along, wins.
    const back = mergeMistakes(
      [puzzle('a', { due: '2026-11-22', streak: 1 })],
      [puzzle('a', { due: '2026-11-30', streak: 2 })],
    )
    expect(back[0]!.streak).toBe(2)
  })
})

describe('collectMistakes', () => {
  // 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? — Black's last move walks into Qxf7#.
  const chess = new Chess()
  for (const san of ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']) chess.move(san)
  const moves = chess.history({ verbose: true })
  const qualities: (MoveQuality | null)[] = [null, 'best', 'inaccuracy', 'good', null, 'blunder']
  const blunder = moves[5]!

  /** The coach's knowledge: the engine prefers 3…g6 before the blunder. */
  const insightAt = (fen: string): Insight => {
    if (fen === blunder.before)
      return { eval: { cp: 300, mate: null }, bestMove: { from: 'g7', to: 'g6' } }
    const afterBest = new Chess(blunder.before)
    afterBest.move('g6')
    if (positionId(fen) === positionId(afterBest.fen()))
      return { eval: { cp: 120, mate: null }, bestMove: null }
    return { eval: null, bestMove: null }
  }

  it('turns a blunder into a puzzle: the position before, the engine’s move, the eval after it', () => {
    const found = collectMistakes(
      moves,
      qualities,
      insightAt,
      new Set(['b']),
      new Date('2026-11-20T10:00:00Z'),
      '2026-11-20',
    )
    expect(found).toEqual([
      {
        id: positionId(blunder.before),
        fen: blunder.before,
        best: 'g7g6',
        bestEval: { cp: 120, mate: null },
        played: 'Nf6',
        createdAt: '2026-11-20T10:00:00.000Z',
        due: '2026-11-21',
        streak: 0,
      },
    ])
  })

  it('takes only the sides asked for, and only mistakes and blunders', () => {
    expect(
      collectMistakes(moves, qualities, insightAt, new Set(['w']), new Date(), '2026-11-20'),
    ).toEqual([])
  })

  it('skips a move the engine would have played itself, whatever its grade', () => {
    const same = (fen: string): Insight =>
      fen === blunder.before
        ? { eval: { cp: 0, mate: null }, bestMove: { from: blunder.from, to: blunder.to } }
        : { eval: { cp: 0, mate: null }, bestMove: null }
    expect(
      collectMistakes(moves, qualities, same, new Set(['b']), new Date(), '2026-11-20'),
    ).toEqual([])
  })

  it('skips a mistake the coach has no engine move or no eval for', () => {
    const blind = () => ({ eval: null, bestMove: null })
    expect(
      collectMistakes(moves, qualities, blind, new Set(['b']), new Date(), '2026-11-20'),
    ).toEqual([])
  })
})

describe('isPlayable', () => {
  it('sets a puzzle whose position loads and whose move is legal, and no other', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(isPlayable(puzzle('a', { fen: start, best: 'e2e4' }))).toBe(true)
    expect(isPlayable(puzzle('b', { fen: start, best: 'e2e5' }))).toBe(false)
    expect(isPlayable(puzzle('c', { fen: 'not a position', best: 'e2e4' }))).toBe(false)
  })
})
