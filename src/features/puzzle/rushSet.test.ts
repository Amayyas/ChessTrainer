import { describe, expect, it } from 'vitest'
import { PUZZLES } from '@/features/puzzle/puzzles'
import { rushPuzzle, rushTarget } from '@/features/puzzle/rushSet'

/** A seeded generator, so a run is the same each time the test runs. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31
    return state / 2 ** 31
  }
}

/** The puzzles of a run of `length`, drawn as the session draws them. */
function run(length: number, seed = 1) {
  const served = new Set<string>()
  const random = seeded(seed)
  return Array.from({ length }, (_, index) => {
    const puzzle = rushPuzzle(index, served, PUZZLES, random)!
    served.add(puzzle.id)
    return puzzle
  })
}

describe('rushPuzzle', () => {
  it('climbs: each puzzle sits near its rung of the ladder', () => {
    // Near, not on: the draw takes one of a handful around the target, and the
    // pool is dense enough that the handful stays within a narrow band.
    run(25).forEach((puzzle, index) => {
      expect(Math.abs(puzzle.rating - rushTarget(index))).toBeLessThan(60)
    })
  })

  it('starts among the easiest puzzles and is past the middle of the pool by the twentieth', () => {
    // Read against the pool, not against rushTarget: a ladder that stopped
    // climbing would still sit on its own rungs.
    const ratings = PUZZLES.map((puzzle) => puzzle.rating).sort((a, b) => a - b)
    const median = ratings[Math.floor(ratings.length / 2)]!
    const puzzles = run(20)
    expect(puzzles[0]!.rating).toBeLessThan(ratings[0]! + 150)
    expect(puzzles[19]!.rating).toBeGreaterThan(median)
  })

  it('ends a long run among the hardest puzzles, not back at the easy ones', () => {
    const hardest = Math.max(...PUZZLES.map((puzzle) => puzzle.rating))
    const late = run(60).slice(40)
    for (const puzzle of late) expect(puzzle.rating).toBeGreaterThan(hardest - 200)
  })

  it('never serves the same puzzle twice in a run', () => {
    const ids = run(60).map((puzzle) => puzzle.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('varies from one run to the next', () => {
    const first = run(10, 1).map((puzzle) => puzzle.id)
    const second = run(10, 7).map((puzzle) => puzzle.id)
    expect(second).not.toEqual(first)
  })

  it('has nothing left once the pool is used up', () => {
    const pool = PUZZLES.slice(0, 2)
    const served = new Set(pool.map((puzzle) => puzzle.id))
    expect(rushPuzzle(0, served, pool)).toBeNull()
  })
})
