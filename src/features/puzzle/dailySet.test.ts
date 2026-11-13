import { describe, expect, it } from 'vitest'
import { DAILY_COUNT, DAILY_POOL, dailyPuzzles } from '@/features/puzzle/dailySet'
import { PUZZLES } from '@/features/puzzle/puzzles'
import { difficultyOf } from '@/features/puzzle/types'

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
    const ranked = [...DAILY_POOL].sort((a, b) => a.rating - b.rating).map((p) => p.id)
    for (const day of ['2026-07-11', '2026-07-12', '2026-08-01', '2026-12-25']) {
      const series = dailyPuzzles(day)
      series.forEach((puzzle, slice) => {
        const rank = ranked.indexOf(puzzle.id)
        expect(rank).toBeGreaterThanOrEqual((slice * ranked.length) / series.length)
        expect(rank).toBeLessThan(((slice + 1) * ranked.length) / series.length)
      })
    }
  })

  it('leaves the expert band out of the series', () => {
    // Expert puzzles are in the pool, so leaving them out is a choice the
    // series makes, not an accident of what was imported.
    expect(PUZZLES.some((puzzle) => difficultyOf(puzzle.rating) === 'expert')).toBe(true)
    for (let day = 1; day <= 60; day += 1) {
      const key = `2026-11-${String((day % 30) + 1).padStart(2, '0')}`
      const seen = day > 30 ? DAILY_POOL.slice(0, 900).map((puzzle) => puzzle.id) : []
      for (const puzzle of dailyPuzzles(key, seen)) {
        expect(difficultyOf(puzzle.rating)).not.toBe('expert')
      }
    }
  })

  it('never repeats a puzzle inside a series', () => {
    const ids = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does not serve a puzzle already solved while the pool has fresh ones', () => {
    const seen = dailyPuzzles('2026-07-11').map((puzzle) => puzzle.id)
    const next = dailyPuzzles('2026-07-11', seen).map((puzzle) => puzzle.id)
    expect(next.some((id) => seen.includes(id))).toBe(false)
  })

  it('recycles from the oldest few once a band is used up, varying by day', () => {
    // Five puzzles in one rating slice, all solved, `pool` order = age order.
    const pool = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      rating: 800 + i,
      fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      solution: ['a1'],
      theme: 't',
      sideToMove: 'w' as const,
    }))
    const seen = pool.map((puzzle) => puzzle.id)
    const oldestThree = seen.slice(0, 3)

    const days = ['2026-07-11', '2026-07-12', '2026-08-01', '2026-09-09', '2026-12-25']
    const picks = days.map((day) => dailyPuzzles(day, seen, pool, 1)[0]!.id)
    // Always one of the three solved longest ago, and not the same one daily.
    expect(picks.every((id) => oldestThree.includes(id))).toBe(true)
    expect(new Set(picks).size).toBeGreaterThan(1)
  })

  it('is stable for a given day and seen list', () => {
    const seen = ['ct-0003', 'ct-0100']
    const a = dailyPuzzles('2026-07-11', seen).map((p) => p.id)
    const b = dailyPuzzles('2026-07-11', seen).map((p) => p.id)
    expect(b).toEqual(a)
  })

  it('copes with a pool smaller than the series', () => {
    expect(dailyPuzzles('2026-07-11', [], PUZZLES.slice(0, 2))).toHaveLength(2)
  })
})
