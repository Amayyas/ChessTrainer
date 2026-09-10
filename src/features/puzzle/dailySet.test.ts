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

  it('takes one puzzle from each rating slice, every day', () => {
    // The guard against a uniform shuffle handing a beginner five 2000+ puzzles:
    // the i-th puzzle must come from the i-th equal slice of the rated pool.
    const ranked = [...PUZZLES].sort((a, b) => a.rating - b.rating).map((p) => p.id)
    for (const day of ['2026-07-11', '2026-07-12', '2026-08-01', '2026-12-25']) {
      const series = dailyPuzzles(day)
      series.forEach((puzzle, slice) => {
        const rank = ranked.indexOf(puzzle.id)
        expect(rank).toBeGreaterThanOrEqual((slice * ranked.length) / series.length)
        expect(rank).toBeLessThan(((slice + 1) * ranked.length) / series.length)
      })
    }
  })

  it('never repeats a puzzle inside a series', () => {
    const ids = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('copes with a pool smaller than the series', () => {
    expect(dailyPuzzles('2026-07-11', PUZZLES.slice(0, 2))).toHaveLength(2)
  })
})
