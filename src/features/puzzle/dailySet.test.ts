import { describe, expect, it } from 'vitest'
import { DAILY_COUNT, dailyPuzzles } from '@/features/puzzle/dailySet'
import { PUZZLES } from '@/features/puzzle/puzzles'

describe('dailyPuzzles', () => {
  it('returns the daily count', () => {
    expect(dailyPuzzles('2026-07-11')).toHaveLength(DAILY_COUNT)
  })

  it('is stable for a given day', () => {
    const first = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    const second = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    expect(second).toEqual(first)
  })

  it('differs from one day to the next', () => {
    const a = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    const b = dailyPuzzles('2026-07-12').map((puzzle) => puzzle.id)
    expect(b).not.toEqual(a)
  })

  it('ramps up from easiest to hardest', () => {
    const ratings = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.rating)
    expect([...ratings].sort((x, y) => x - y)).toEqual(ratings)
  })

  it('never repeats a puzzle inside a series', () => {
    const ids = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('copes with a pool smaller than the series', () => {
    expect(dailyPuzzles('2026-07-11', PUZZLES.slice(0, 2))).toHaveLength(2)
  })
})
