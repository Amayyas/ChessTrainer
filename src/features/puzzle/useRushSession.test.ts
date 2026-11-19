import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PUZZLES } from '@/features/puzzle/puzzles'
import { RUSH_DURATION_MS, RUSH_MAX_STRIKES } from '@/features/puzzle/rushSet'
import type { Puzzle } from '@/features/puzzle/types'
import { RUSH_PAUSE_MS, useRushSession } from '@/features/puzzle/useRushSession'
import { useProgressionStore } from '@/store/useProgressionStore'
import type { Square } from '@/utils/chess'

/** Mate-in-one puzzles: one move solves each, which keeps a run short to script. */
const pool: Puzzle[] = PUZZLES.filter((puzzle) => puzzle.solution.length === 1).slice(0, 40)

type Session = { current: ReturnType<typeof useRushSession> }

function render() {
  // The first of the nearest, always: the run is the same each time.
  return renderHook(() => useRushSession({ pool, random: () => 0 })).result as Session
}

function play(session: Session, uci: string) {
  act(() => {
    session.current.attempt(uci.slice(0, 2) as Square, uci.slice(2, 4) as Square)
  })
}

/** Solves the puzzle on the board, then lets the pause run out. */
function solve(session: Session) {
  play(session, session.current.puzzle!.solution[0]!)
  act(() => vi.advanceTimersByTime(RUSH_PAUSE_MS))
}

/** A legal move that is not the solution: a wrong answer, not an illegal one. */
function blunder(session: Session) {
  const solution = session.current.puzzle!.solution[0]!
  const from = solution.slice(0, 2) as Square
  const elsewhere = session.current
    .getLegalTargets(from)
    .find((square) => square !== solution.slice(2, 4))
  if (!elsewhere) throw new Error('expected another legal move for the solving piece')
  play(session, `${from}${elsewhere}`)
  act(() => vi.advanceTimersByTime(RUSH_PAUSE_MS))
}

beforeEach(() => {
  vi.useFakeTimers()
  useProgressionStore.getState().reset()
})
afterEach(() => vi.useRealTimers())

describe('useRushSession', () => {
  it('waits for the player before the clock starts', () => {
    const session = render()
    expect(session.current.phase).toBe('ready')
    expect(session.current.puzzle).toBeNull()
  })

  it('counts each solved puzzle and moves on to a new one', () => {
    const session = render()
    act(() => session.current.start())
    const first = session.current.puzzle!.id

    solve(session)
    expect(session.current.solved).toBe(1)
    expect(session.current.puzzle!.id).not.toBe(first)
  })

  it('takes a strike for a wrong move and moves on, without counting it twice', () => {
    const session = render()
    act(() => session.current.start())
    const first = session.current.puzzle!.id
    const solution = session.current.puzzle!.solution[0]!
    const from = solution.slice(0, 2) as Square
    const wrong = session.current.getLegalTargets(from).filter((s) => s !== solution.slice(2, 4))

    // Two wrong moves on the same board before the pause runs out: one strike.
    play(session, `${from}${wrong[0]}`)
    play(session, `${from}${wrong[1] ?? wrong[0]}`)
    expect(session.current.strikes).toBe(1)
    expect(session.current.isPaused).toBe(true)

    act(() => vi.advanceTimersByTime(RUSH_PAUSE_MS))
    expect(session.current.puzzle!.id).not.toBe(first)
    expect(session.current.solved).toBe(0)
  })

  it('ends on the last strike the run can take', () => {
    const session = render()
    act(() => session.current.start())
    solve(session)
    for (let strike = 0; strike < RUSH_MAX_STRIKES; strike += 1) blunder(session)
    expect(session.current.phase).toBe('over')
    expect(session.current.lastRun?.score).toBe(1)
  })

  it('ends when the clock runs out, whatever the board', () => {
    const session = render()
    act(() => session.current.start())
    solve(session)
    solve(session)
    act(() => vi.advanceTimersByTime(RUSH_DURATION_MS))
    expect(session.current.phase).toBe('over')
    expect(session.current.remainingMs).toBe(0)
    expect(session.current.lastRun?.score).toBe(2)
  })

  it('enters the run in the ranking, and says when it beats the best', () => {
    const session = render()
    act(() => session.current.start())
    solve(session)
    solve(session)
    act(() => vi.advanceTimersByTime(RUSH_DURATION_MS))
    expect(session.current.isNewBest).toBe(true)
    expect(session.current.ranking.map((run) => run.score)).toEqual([2])

    // A run that only matches the best is no new record.
    act(() => session.current.start())
    solve(session)
    solve(session)
    act(() => vi.advanceTimersByTime(RUSH_DURATION_MS))
    expect(session.current.isNewBest).toBe(false)
    expect(session.current.ranking.map((run) => run.score)).toEqual([2, 2])

    // A weaker run is ranked too, but beats nothing.
    act(() => session.current.start())
    solve(session)
    act(() => vi.advanceTimersByTime(RUSH_DURATION_MS))
    expect(session.current.isNewBest).toBe(false)
    expect(session.current.ranking.map((run) => run.score)).toEqual([2, 2, 1])
  })

  it('ranks nothing for a run that solved nothing, and pays no XP for any', () => {
    const session = render()
    act(() => session.current.start())
    act(() => vi.advanceTimersByTime(RUSH_DURATION_MS))
    expect(session.current.ranking).toEqual([])

    act(() => session.current.start())
    solve(session)
    act(() => vi.advanceTimersByTime(RUSH_DURATION_MS))
    const progression = useProgressionStore.getState()
    expect(progression.xp).toBe(0)
    expect(progression.puzzleProgress.seenPuzzleIds).toEqual([])
  })
})
