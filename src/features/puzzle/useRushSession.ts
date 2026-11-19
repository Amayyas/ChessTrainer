import { useCallback, useEffect, useRef, useState } from 'react'
import { recordRushRun, type RushRun } from '@/features/puzzle/progress'
import { PUZZLES } from '@/features/puzzle/puzzles'
import { RUSH_DURATION_MS, RUSH_MAX_STRIKES, rushPuzzle } from '@/features/puzzle/rushSet'
import type { Puzzle } from '@/features/puzzle/types'
import { usePuzzleRunner, type PuzzleRunner } from '@/features/puzzle/usePuzzleRunner'
import { useProgressionStore } from '@/store/useProgressionStore'

export type RushPhase = 'ready' | 'running' | 'over'

/**
 * How long the board holds an answered puzzle before the next one: long enough
 * to see the frame turn ink or red, short enough not to eat into the clock.
 */
export const RUSH_PAUSE_MS = 400

export interface UseRushSession extends PuzzleRunner {
  phase: RushPhase
  puzzle: Puzzle | null
  /** Puzzles solved in this run: its score. */
  solved: number
  /** Wrong moves so far; the run ends at RUSH_MAX_STRIKES. */
  strikes: number
  remainingMs: number
  /** Between an answer and the next puzzle, when the board takes no move. */
  isPaused: boolean
  /** The player's best runs, best first. */
  ranking: RushRun[]
  /** The run that just ended, once it has. */
  lastRun: RushRun | null
  /** Whether the run that just ended beat the player's best. */
  isNewBest: boolean
  start: () => void
}

/**
 * Puzzle Rush: three minutes to solve as many puzzles as possible, each a rung
 * harder than the last. A wrong move costs a strike and moves on; the third
 * strike ends the run, as does the clock.
 *
 * A run earns no XP and marks no puzzle solved. It is a sprint against the
 * clock, not study: the puzzles it rushes past stay fresh for the daily series,
 * and a quick run cannot be farmed for points. What it keeps is the player's
 * ranking of runs, which follows their account like the rest of the progress.
 */
export function useRushSession(
  options: { pool?: readonly Puzzle[]; random?: () => number } = {},
): UseRushSession {
  const { pool = PUZZLES, random = Math.random } = options
  const ranking = useProgressionStore((state) => state.puzzleProgress.rushRuns)
  const setProgress = useProgressionStore((state) => state.setPuzzleProgress)

  const [phase, setPhase] = useState<RushPhase>('ready')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [solved, setSolved] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [deadline, setDeadline] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [lastRun, setLastRun] = useState<RushRun | null>(null)
  const [isNewBest, setIsNewBest] = useState(false)
  const [epoch, setEpoch] = useState(0)

  // Mutable run state the callbacks below share without going stale.
  const run = useRef({ index: 0, served: new Set<string>(), solved: 0, ended: true })
  const pause = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const end = useCallback(() => {
    if (run.current.ended) return
    run.current.ended = true
    clearTimeout(pause.current)
    setPhase('over')
    setIsPaused(false)

    const score = run.current.solved
    const finished: RushRun = { score, at: new Date().toISOString() }
    setLastRun(finished)
    const best = useProgressionStore.getState().puzzleProgress.rushRuns[0]?.score ?? 0
    setIsNewBest(score > best)
    // A run that solved nothing has nothing to rank.
    if (score > 0) {
      setProgress((progress) => ({
        ...progress,
        rushRuns: recordRushRun(progress.rushRuns, finished),
      }))
    }
  }, [setProgress])

  const advance = useCallback(() => {
    if (run.current.ended) return
    run.current.index += 1
    const next = rushPuzzle(run.current.index, run.current.served, pool, random)
    if (!next) return end()
    run.current.served.add(next.id)
    setPuzzle(next)
    setIsPaused(false)
  }, [pool, random, end])

  /** Holds the answered puzzle a moment, then moves on. */
  const moveOn = useCallback(() => {
    setIsPaused(true)
    clearTimeout(pause.current)
    pause.current = setTimeout(advance, RUSH_PAUSE_MS)
  }, [advance])

  const onSolved = useCallback(() => {
    if (run.current.ended) return
    run.current.solved += 1
    setSolved(run.current.solved)
    moveOn()
  }, [moveOn])

  const runner = usePuzzleRunner(puzzle, onSolved, epoch)

  // A wrong move is a strike, and the puzzle is lost: on to the next, unless
  // it was the last strike the run could take. The pause keeps a second wrong
  // move on the same board from counting twice.
  useEffect(() => {
    if (phase !== 'running' || isPaused || runner.errors === 0) return
    const struck = strikes + 1
    setStrikes(struck)
    if (struck >= RUSH_MAX_STRIKES) end()
    else moveOn()
  }, [runner.errors, phase, isPaused, strikes, end, moveOn])

  // The clock, read against a deadline rather than counted down, so a slow
  // tick or a hidden tab never gives the player extra time.
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= deadline) end()
    }, 200)
    return () => clearInterval(id)
  }, [phase, deadline, end])

  useEffect(() => () => clearTimeout(pause.current), [])

  const start = useCallback(() => {
    clearTimeout(pause.current)
    const served = new Set<string>()
    const first = rushPuzzle(0, served, pool, random)
    if (!first) return
    served.add(first.id)
    run.current = { index: 0, served, solved: 0, ended: false }
    const startedAt = Date.now()
    setPuzzle(first)
    setSolved(0)
    setStrikes(0)
    setIsPaused(false)
    setLastRun(null)
    setIsNewBest(false)
    setNow(startedAt)
    setDeadline(startedAt + RUSH_DURATION_MS)
    // A fresh runner even if the first puzzle happens to be the last one shown.
    setEpoch((count) => count + 1)
    setPhase('running')
  }, [pool, random])

  return {
    ...runner,
    phase,
    puzzle,
    solved,
    strikes,
    remainingMs: phase === 'running' ? Math.max(0, deadline - now) : 0,
    isPaused,
    ranking,
    lastRun,
    isNewBest,
    start,
  }
}
