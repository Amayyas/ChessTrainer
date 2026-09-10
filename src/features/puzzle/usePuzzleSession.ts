import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAILY_COUNT, dailyPuzzles } from '@/features/puzzle/dailySet'
import { dayKey, markSeen, recordSolved, type PuzzleProgress } from '@/features/puzzle/progress'
import { PUZZLES } from '@/features/puzzle/puzzles'
import type { Puzzle } from '@/features/puzzle/types'
import {
  scorePuzzle,
  usePuzzleRunner,
  type PuzzleRunner,
  type SolvedResult,
} from '@/features/puzzle/usePuzzleRunner'
import { useProgressionStore } from '@/store/useProgressionStore'

export {
  BASE_POINTS,
  ERROR_COST,
  HINT_COST,
  deliversMate,
  scorePuzzle,
} from '@/features/puzzle/usePuzzleRunner'
export type { MoveFeedback } from '@/features/puzzle/usePuzzleRunner'

export interface PuzzleScore {
  puzzleId: string
  points: number
  errors: number
  hints: number
  elapsedMs: number
}

export interface UsePuzzleSession extends PuzzleRunner {
  puzzles: Puzzle[]
  index: number
  puzzle: Puzzle | null
  /** Every puzzle of the day is done. */
  isSessionOver: boolean
  scores: PuzzleScore[]
  totalPoints: number
  progress: PuzzleProgress
  next: () => void
  restart: () => void
}

/**
 * Runs the daily puzzle series: five puzzles for the calendar day, the streak
 * and XP recorded on each solve, a bilan at the end.
 */
export function usePuzzleSession(): UsePuzzleSession {
  // The day is locked when the session starts, so the series does not swap out
  // from under a puzzle in progress at midnight.
  const [today] = useState(() => dayKey())
  const setProgress = useProgressionStore((state) => state.setPuzzleProgress)
  const recordPuzzle = useProgressionStore((state) => state.recordPuzzle)
  const progress = useProgressionStore((state) => state.puzzleProgress)

  // Both snapshotted at mount, like `today`: a day's series is fixed once
  // picked, so working through it — which grows the solved list — cannot
  // reshuffle it, and reopening the day resumes the same five.
  const [savedSeries] = useState(() => useProgressionStore.getState().puzzleProgress.dailySeries)
  const [seenAtStart] = useState(() => useProgressionStore.getState().puzzleProgress.seenPuzzleIds)

  const puzzles = useMemo<Puzzle[]>(() => {
    if (savedSeries?.day === today) {
      const byId = new Map(PUZZLES.map((puzzle) => [puzzle.id, puzzle]))
      const resolved = savedSeries.ids
        .map((id) => byId.get(id))
        .filter((p): p is Puzzle => Boolean(p))
      // Fall through to a fresh pick if the pool was regenerated under it.
      if (resolved.length === savedSeries.ids.length && resolved.length > 0) return resolved
    }
    return dailyPuzzles(today, seenAtStart)
  }, [today, savedSeries, seenAtStart])

  // Persist the day's picks the first time they are computed.
  useEffect(() => {
    if (savedSeries?.day !== today && puzzles.length > 0) {
      setProgress((current) => ({
        ...current,
        dailySeries: { day: today, ids: puzzles.map((puzzle) => puzzle.id) },
      }))
    }
  }, [today, savedSeries, puzzles, setProgress])

  const [index, setIndex] = useState(0)
  const [epoch, setEpoch] = useState(0)
  const [scores, setScores] = useState<PuzzleScore[]>([])

  const puzzle = puzzles[index] ?? null

  const onSolved = useCallback(
    (result: SolvedResult) => {
      if (!puzzle) return
      const puzzleId = puzzle.id
      // First time this puzzle is solved, ever — a replay of a finished series
      // must not pay out XP, the solve count or the streak badge a second time.
      const firstSolve = !useProgressionStore
        .getState()
        .puzzleProgress.seenPuzzleIds.includes(puzzleId)

      setScores((all) => [
        ...all,
        { puzzleId, points: scorePuzzle(result.errors, result.hints), ...result },
      ])
      setProgress((current) => ({
        // Advance the streak and totals on a puzzle's first solve, and on the
        // first solve of a new day even if the series has recycled a seen one —
        // but never again when replaying puzzles already solved today.
        ...(firstSolve || current.lastSolvedDay !== today ? recordSolved(current, today) : current),
        seenPuzzleIds: markSeen(current.seenPuzzleIds, puzzleId),
      }))

      if (firstSolve) {
        recordPuzzle({
          flawless: result.errors === 0 && result.hints === 0,
          // The streak after this solve, which recordSolved has just advanced.
          streak: useProgressionStore.getState().puzzleProgress.streak,
        })
      }
    },
    [puzzle, today, setProgress, recordPuzzle],
  )

  const runner = usePuzzleRunner(puzzle, onSolved, epoch)

  const next = useCallback(() => setIndex((current) => current + 1), [])
  const restart = useCallback(() => {
    setIndex(0)
    setScores([])
    setEpoch((current) => current + 1)
  }, [])

  return {
    ...runner,
    puzzles,
    index,
    puzzle,
    isSessionOver: index >= Math.min(DAILY_COUNT, puzzles.length),
    scores,
    totalPoints: scores.reduce((sum, score) => sum + score.points, 0),
    progress,
    next,
    restart,
  }
}
